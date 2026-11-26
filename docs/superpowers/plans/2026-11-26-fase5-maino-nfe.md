# Fase 5a — NF-e pela Mainô Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O admin envia o pedido pago para a Mainô, emite a NF-e, acompanha a autorização e o pedido vira Faturado com DANFE e e-mail ao cliente.

**Architecture:** Migration nova (colunas NF-e em `pedidos`, cache de token, função service_role que aplica o resultado). Cliente HTTP server-only em `web/lib/maino/`, Server Actions admin em `web/services/nfe-admin.ts`, painel no detalhe do pedido. e2e com um servidor Mainô falso.

**Tech Stack:** Supabase Postgres + pgTAP, Next.js 15 App Router (Server Actions), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-fase5-maino-nfe-design.md` (leia antes). Notas da API: `docs/integracoes/maino-api.md`.

## Global Constraints
- Migrations: só arquivos novos, prefixo `20261127…`; nunca editar migrations antigas. Funções `security definer` com `set search_path = ''`.
- Código que usa service role ou credenciais Mainô: módulos com `import "server-only"`.
- Server Actions admin: chamam `exigirAdmin()` primeiro e retornam `ResultadoAdmin<T>` (`web/lib/admin/resultado.ts`).
- Ações NF-e só rodam com `flags.nfeAutomatica` (`web/lib/flags.ts`); com a flag desligada retornam `{ ok:false, erro:"Emissão automática de NF-e desligada." }` e o painel não mostra o bloco.
- Nunca logar/retornar credenciais, token ou corpo completo de resposta da Mainô; mensagens de erro ao admin: só `errors`/`error` da Mainô, cortadas em 500 caracteres.
- Valores da API: base padrão `https://api.maino.com.br/api/v2`; status NF-e exatamente `NAO_TRANSMITIDA, EM_TRANSMISSAO, ACEITA, REJEITADA, CANCELADA, DENEGADA`; `numero` do pedido Mainô `SITE-<numero>`; `indicador_ie` contribuinte→1, isento→2, nao_contribuinte→9; `modalidade_frete` padrão `9`.
- Timeout de 15 s por chamada à Mainô; 429 → espera `Retry-After` (máx. 5 s) e tenta uma vez; 401 → refaz login uma vez.
- Textos do painel e do e-mail em português.
- O fluxo manual atual (status + campos de nota no painel) continua funcionando e seus testes não mudam.

## Review Focus
- Clicar "Enviar para a Mainô" duas vezes (ou com `maino_pedido_id` já gravado) não pode criar dois pedidos na Mainô.
- Atualizar situação com a nota `ACEITA` duas vezes não pode gerar dois eventos nem dois e-mails.
- Pedido que não está `pago` (ex.: cancelado) não pode ser enviado/emitido.
- Mainô fora do ar / timeout / 422: o painel mostra o erro e nada é gravado pela metade.
- Lojista sem telefone ou com CEP que a ViaCEP não acha: o pedido ainda é enviado.

---

### Task 1: Banco — colunas NF-e, cache de token e `sistema_registrar_nfe`

**Files:**
- Create: `supabase/migrations/20261127000001_maino_nfe.sql`
- Test: `supabase/tests/maino_nfe.test.sql`

**Interfaces:**
- Produces:
  - `pedidos.maino_pedido_id text`, `pedidos.nfe_status text` (check nos 6 status ou null), `pedidos.nfe_erro text`, `pedidos.nfe_atualizado_em timestamptz`.
  - Tabela `public.integracao_tokens (provedor text primary key, access_token text not null, atualizado_em timestamptz not null default now())`, RLS ligada, sem policies, `revoke all` de `anon, authenticated`.
  - `public.sistema_registrar_nfe(p_pedido_id uuid, p_maino_pedido_id text default null, p_nfe_status text default null, p_chave text default null, p_danfe_url text default null, p_erro text default null) returns boolean` — security definer, execute só para `service_role`. Com lock `for update` no pedido: grava `maino_pedido_id` (se não nulo e ainda não gravado; se já houver outro diferente → exceção `maino_pedido_divergente`), `nfe_status` (se não nulo), `maino_nota_id = p_chave` e `maino_nota_url = p_danfe_url` (se não nulos; danfe precisa começar com `https://` senão `url_invalida`), `nfe_erro = p_erro` (sempre, para limpar com null), `nfe_atualizado_em = now()`. Se `p_nfe_status = 'ACEITA'` e o pedido está `pago`: status → `faturado` + `pedido_eventos` (`admin_id` null) e retorna `true`; caso contrário retorna `false`. Exceção `pedido_nao_encontrado` se não existir.

- [ ] Step 1: pgTAP cobrindo: colunas e check (status inválido falha); `integracao_tokens` inacessível a `authenticated`/`anon`; `sistema_registrar_nfe` negado a `authenticated`; ACEITA em pedido `pago` → `true`, status `faturado`, 1 evento com admin_id null, chave/url gravadas; segunda chamada ACEITA → `false` e ainda 1 evento; ACEITA em pedido `aguardando_pagamento` → `false`, status inalterado; `maino_pedido_id` divergente → exceção; danfe `http://` → `url_invalida`; `p_erro` null limpa `nfe_erro`.
- [ ] Step 2: `npx supabase test db` falha. Step 3: escrever a migration. Step 4: `npx supabase db reset && npx supabase test db` passa (todas as suítes).
- [ ] Step 5: Regenerar tipos se o projeto mantiver `web/types/database.ts` (ou equivalente) e commitar.

### Task 2: Cliente Mainô e montagem do pedido (`web/lib/maino/`)

**Files:**
- Create: `web/lib/maino/config.ts`, `web/lib/maino/cliente.ts`, `web/lib/maino/montar-pedido.ts`, `web/lib/maino/ibge.ts`
- Test: `web/lib/maino/cliente.test.ts`, `web/lib/maino/montar-pedido.test.ts`, `web/lib/maino/ibge.test.ts`

**Interfaces:**
- Consumes: `integracao_tokens` (Task 1) via `createAdminClient()`.
- Produces:
  - `lerConfigMaino(env = process.env): ConfigMaino | null` — null se faltar `MAINO_APPLICATION_UID`/`MAINO_EMAIL`/`MAINO_SENHA`. `ConfigMaino = { apiUrl, applicationUid, email, senha, condicaoPagamentoId?: string, formaPagamento?: number, planoDeConta?: string, modalidadeFrete: number }`.
  - `type RespostaMaino<T> = { ok: true; status: number; dados: T } | { ok: false; status: number; erro: string }`.
  - `chamarMaino<T>(cfg: ConfigMaino, metodo: "GET"|"POST"|"DELETE", caminho: string, corpo?: unknown, deps?: { fetch?: typeof fetch; tokens?: TokenStore; esperar?: (ms:number)=>Promise<void> }): Promise<RespostaMaino<T>>` — token do `TokenStore` (padrão: tabela `integracao_tokens`, provedor `maino`); sem token → `POST /authentication`; 401 → re-login uma vez; 429 → `Retry-After` (máx. 5 s) e repete uma vez; timeout 15 s → `{ok:false,status:0,erro:"Mainô não respondeu a tempo."}`; erro de rede → `status:0`. `erro` = texto de `error` ou `errors` (objeto/array achatado em "campo: msg; …"), máx. 500 caracteres. 204 → `dados: null`.
  - `type TokenStore = { ler(): Promise<string|null>; gravar(token: string): Promise<void> }`.
  - `montarPedidoMaino(p: PedidoParaMaino, cfg: ConfigMaino, ibge: number | null): object` (puro) — conforme "Mapeamento do pedido" do spec. `PedidoParaMaino` = dados do pedido (numero, cliente_*, entrega_*, frete_valor, observacao, itens {codigo, nome, quantidade, preco_unitario}) + `email`, `telefone` do lojista. Telefone: só dígitos; com 10–11 dígitos → `ddd` (2 primeiros) + `telefone` (resto); senão omite ambos.
  - `buscarIbgePorCep(cep: string, f = fetch): Promise<number|null>` — ViaCEP, timeout 5 s, qualquer falha → null.
- [ ] Testes (fetch falso): login + chamada com `Authorization: Bearer`; token em cache reaproveitado sem login; 401 → re-login e sucesso; 401 duas vezes → erro; 429 com `Retry-After: 2` → espera 2000 ms e sucesso; 422 `{"errors":{"cliente.cnpj":["inválido"]}}` → erro "cliente.cnpj: inválido"; timeout; corpo de login nunca aparece em `erro`. `montarPedidoMaino`: PJ contribuinte (cnpj, indicador_ie 1, IE), PF (cpf, 9), isento (2), telefone `(81) 99999-0000` → ddd 81 / 999990000, sem telefone, `cobranca` ausente sem condição e presente com condição, `pu` = preço final, `numero` `SITE-42`, ibge null omite `municipio`. ViaCEP: ok → número; `{"erro":true}` → null; rede → null.
- [ ] `npx vitest run lib/maino` passa; `npx tsc --noEmit` limpo. Commit.

### Task 3: Server Actions de NF-e e e-mail de nota emitida

**Files:**
- Create: `web/services/nfe-admin.ts`, `web/services/nfe-admin.test.ts`
- Modify: `web/lib/email/pedido.ts` (+ teste em `pedido.test.ts`)

**Interfaces:**
- Consumes: Task 1 (`sistema_registrar_nfe`), Task 2 (todas as funções).
- Produces (todas `"use server"`, `exigirAdmin()` primeiro, `ResultadoAdmin<SituacaoNfe>`; `SituacaoNfe = { maino_pedido_id: string|null; nfe_status: string|null; nfe_erro: string|null; maino_nota_url: string|null; status: PedidoStatus }`):
  - `enviarPedidoMaino(pedidoId: string)` — exige status `pago` e `maino_pedido_id` nulo (se já existir, retorna ok com a situação atual sem chamar a Mainô); `POST /pedidos?transmite=0`; grava o id retornado (`id` do corpo, ou `pedido.id`) via `sistema_registrar_nfe`; falha → grava `p_erro` e retorna erro.
  - `emitirNfeMaino(pedidoId)` — exige `pago` e `maino_pedido_id`; `POST /pedidos/{id}/nota_fiscal`; depois chama a sincronização.
  - `sincronizarNfeMaino(pedidoId)` — `GET /pedidos/{id}/nota_fiscal`; grava status/chave/danfe; se `sistema_registrar_nfe` retornar `true`, envia ao cliente `montarEmailNotaEmitida` (via `after()`, como `notificarPedido`).
  - `cancelarNfeMaino(pedidoId)` — exige `nfe_status = 'ACEITA'`; `DELETE`; 204 → grava `CANCELADA`.
  - Todas: `revalidatePath` do detalhe admin e da área do cliente do pedido.
- `montarEmailNotaEmitida(p: { numero: number; cliente_nome: string; email: string; danfe_url: string; linkPedido: string }): Email` — assunto `Nota fiscal do pedido #<numero>`, link do DANFE e do pedido, HTML escapado.
- [ ] Testes com Mainô/Supabase mockados (padrão dos outros `*.test.ts` de services): flag desligada; não-admin; enviar duas vezes chama a Mainô uma vez; pedido `cancelado` recusado; erro 422 vira `nfe_erro`; ACEITA dispara um e-mail; `true`→e-mail, `false`→nenhum.
- [ ] `npx vitest run` todo verde; tsc/lint limpos. Commit.

### Task 4: Painel do pedido (admin) e e2e com Mainô falsa

**Files:**
- Modify: `web/src/app/[locale]/admin/pedidos/[numero]/page.tsx`, `web/services/pedidos-admin.ts` (expor campos NF-e no detalhe)
- Create: `web/components/admin/PainelNfe.tsx`, `web/e2e/maino-falso.ts`, `web/e2e/nfe.spec.ts`
- Modify: `web/e2e/global-setup.ts`, `web/playwright.config.ts`

**Interfaces:**
- Consumes: Task 3.
- Bloco "Nota fiscal (Mainô)" só com a flag: mostra status traduzido (Aguardando transmissão, Em transmissão, Autorizada, Rejeitada, Cancelada, Denegada), erro, link "DANFE (PDF)", chave; botões conforme estado: `pago` sem `maino_pedido_id` → "Enviar para a Mainô"; com id e sem nota ou REJEITADA → "Emitir NF-e"; NAO_TRANSMITIDA/EM_TRANSMISSAO → "Atualizar situação"; ACEITA → "Cancelar NF-e" (com `confirm`). Botões desabilitados enquanto pendentes.
- Ao abrir o detalhe com `nfe_status` NAO_TRANSMITIDA/EM_TRANSMISSAO, a página chama `sincronizarNfeMaino` antes de renderizar (falha não quebra a página).
- `maino-falso.ts`: servidor HTTP em `127.0.0.1:4010` com rotas `/api/v2/authentication`, `POST /api/v2/pedidos`, `POST|GET|DELETE /api/v2/pedidos/:id/nota_fiscal`; a primeira consulta devolve `EM_TRANSMISSAO`, a seguinte `ACEITA` com `danfe_url` https; guarda as requisições recebidas para asserções (rota `GET /__requisicoes`). Iniciado no `globalSetup` (retorna teardown).
- `playwright.config.ts` `webServer.env`: `FEATURE_NFE_AUTOMATICA: "true"`, `MAINO_API_URL: "http://127.0.0.1:4010/api/v2"`, credenciais fictícias.
- [ ] e2e: admin marca pedido Pago → Enviar → Emitir → (Em transmissão) → Atualizar → Autorizada, pedido Faturado, link DANFE visível no admin e na área do cliente; pedido falso recebeu `numero: "SITE-<n>"` e itens com `codigo`. Os e2e existentes continuam verdes.
- [ ] `npx playwright test` completo verde; lint/tsc. Commit.

### Task 5: Build guard, configuração e documentação

**Files:**
- Modify: `web/lib/build/verificar-producao.mjs` (+ teste existente), `web/.env.example`, `web/README.md`, `docs/architecture.md`, `docs/integracoes/maino-api.md`

- [ ] Guard: produção com `FEATURE_NFE_AUTOMATICA=true` exige `MAINO_APPLICATION_UID`, `MAINO_EMAIL`, `MAINO_SENHA` (teste).
- [ ] `.env.example` com todas as variáveis `MAINO_*` comentadas; README seção "NF-e automática (Mainô)": pré-requisitos (produtos cadastrados na Mainô com o mesmo código, condição de pagamento, ambiente Homologação para testar), onde pôr as credenciais (Vercel), passo a passo do admin. `maino-api.md`: "Decisões da integração".
- [ ] Testes do guard verdes. Commit.
