# Fases 2–4 — Catálogo, Carrinho e Pedido: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site da Nex funcionando de ponta a ponta sem Strapi:
- catálogo público;
- preço com desconto para o lojista, carrinho, cupom ("vale o maior") e
  gerar pedido com e-mails;
- painel do admin para produtos (com importação por planilha), descontos,
  cupons e pedidos.

**Architecture:** As regras de preço, cupom e pedido ficam em funções
Postgres (abordagem A). O Next.js chama essas funções por RPC. As páginas
públicas usam um client Supabase sem cookies, para ficarem ISR com
revalidação por tag. Preço e carrinho são ilhas client. Os e-mails saem pelo
Resend (HTTP), a partir de Server Actions, depois que o pedido é gravado.

**Tech Stack:**
- Next.js 15.5.29 (App Router), React 19.1, next-intl 4, Tailwind 4 (tokens
  `marca-*`);
- Supabase (Postgres 17, RLS, pgTAP);
- Vitest, Playwright;
- `exceljs` (só no servidor), Cloudinary (upload assinado), Resend (API
  HTTP).

**Spec:** `docs/superpowers/specs/2026-11-25-fase2-4-catalogo-carrinho-pedido-design.md`
(continua `docs/superpowers/specs/2026-09-15-supabase-foundation-auth-design.md`).

## Global Constraints

**Banco e regras**
- Migrations **novas** em `supabase/migrations/` (prefixo `20261126…`).
  Nunca editar as de `20261125…`.
- Funções `security definer` usam `set search_path = ''` e nomes
  qualificados (`public.x`).
- `execute` é revogado de `public` e `anon`. As funções do cliente têm
  grant para `authenticated`. `marcar_pedido_notificado` só para
  `service_role`.
- Admin é checado por `public.is_admin()` (Fase 1), nas funções e em toda
  Server Action de admin (`exigirAdmin()` de `@/lib/auth/exigir-admin`).
- Preço com desconto: `round(preco_tabela * (1 - pct/100), 2)` **por
  unidade**. Linha = preço unitário × quantidade.
- Vale o maior: compara em reais `desconto_cliente` × `desconto_cupom`.
  O cupom vence só se for **estritamente maior**. Quando o cupom perde ou
  empata, `pedidos.cupom_id = null`.
- Cupom:
  - código comparado com `upper(trim(codigo))`;
  - `valor_minimo_pedido` comparado com o subtotal de tabela;
  - `max_usos` conta os pedidos não `cancelado` com aquele `cupom_id`;
  - uso único por cliente (pedido não `cancelado` com o mesmo `cupom_id` e
    `lojista_id`);
  - cupom em valor é limitado ao subtotal de tabela.
- Quantidade no carrinho: inteiro de 1 a 9999.
- `pedidos.observacao`: até 500 caracteres.
- Frete, ICMS e DIFAL = 0. Na tela, o frete aparece como "a combinar"
  (pt), "to be arranged" (en) e "a convenir" (es).
- Status inicial do pedido: `aguardando_pagamento`;
  `gateway_provider = 'manual'`.
- Transições de status permitidas:
  - `aguardando_pagamento→{pago,cancelado}`
  - `pago→{faturado,cancelado}`
  - `faturado→enviado`
  - `enviado→entregue`
  - `entregue→devolvido`

**Interface e site**
- UI: só os tokens `marca-preto`, `marca-branco` e `marca-cinza-50…900`.
  **Nenhuma classe `blue-*`/`red-*` nova.** Os componentes de catálogo
  reescritos perdem o azul antigo.
- Admin só em português. Público e cliente em pt/en/es: toda string nova vai
  para `web/messages/{pt,en,es}.json`.
- Páginas públicas de catálogo: sem `cookies()`, `headers()` ou client
  `@/lib/supabase/server`. Usam `createPublicClient()` (Task 3) com
  `revalidate: 3600` e tag `catalogo`.
- Server Actions de admin retornam `ResultadoAdmin<T>` =
  `{ ok: true; dados: T } | { ok: false; erro: string }`, o mesmo tipo de
  `web/services/lojistas-admin.ts`.
- E-mails só em português.
  - Remetente: `process.env.EMAIL_REMETENTE ?? "Nex Controls <contato@nexcontrols.com>"`.
  - Destino Nex: `process.env.EMAIL_PEDIDOS_DESTINO ?? "contato@nexcontrols.com"`.
- Sem `RESEND_API_KEY` e fora de `VERCEL_ENV=production`, `enviarEmail`
  escreve `[email simulado] <para> <assunto>` no `console.info` e retorna
  `{ ok: true }`.
- Uploads: imagem com no máximo 5 MB (`resource_type` `image`, pasta
  `nex/produtos`); PDF com no máximo 20 MB (`resource_type` `raw`, pasta
  `nex/manuais`).
- Texto de produto (`descricao`, `aplicacoes`): renderizado como texto, com
  parágrafos separados por linha em branco e itens de lista para linhas que
  começam com `- `. **Nunca** `dangerouslySetInnerHTML`.
- Não tocar `backend/` nem `mobile/`.

**Processo e testes**
- Commits no estilo do repo (`:sparkles: feat: …`, `:bug: fix: …`, em
  português), com a linha
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comandos, a partir da raiz do worktree:
  - `npm run db:reset` e `npm run db:test` (pgTAP);
  - `npm run db:types` (regenera `web/types/database.ts`);
  - dentro de `web/`: `npm test`, `npm run lint`, `npx tsc --noEmit` e
    `npm run e2e`.
- Testes pgTAP: as contagens são sempre restritas aos ids das fixtures do
  próprio teste. Usar os helpers de `supabase/tests/_helpers.psql`
  (`tests.id`, `tests.autenticar_como`, `tests.anonimo`,
  `tests.como_superuser`).

## Review Focus

1. **"Gerar pedido" clicado duas vezes:** o segundo clique não cria outro
   pedido. Retorna `carrinho_vazio`. *(Teste na Task 2.)*
2. **Planilha preenchida pelo Excel** com NCM/EAN/código numéricos (EAN em
   notação científica, zero à esquerda perdido no NCM) e preço como texto
   `"189,90"` ou número: os valores são normalizados, e um erro claro aparece
   quando não dá para recuperar. *(Teste na Task 6.)*
3. **Cupom aplicado e depois o carrinho muda** (quantidade ou remoção): o
   resumo é recalculado. Um cupom que ficou abaixo do mínimo é mostrado como
   inválido com o motivo. *(Teste na Task 8.)*
4. **Quantidade inválida** (0, negativa, fracionada, 100000, texto) no
   carrinho ou na página do produto: é recusada sem erro 500, e o valor
   anterior fica. *(Testes nas Tasks 2 e 8.)*
5. **Texto com HTML** no nome, na descrição ou na observação (`<script>`,
   `<img onerror>`): aparece como texto no site e é escapado nos e-mails.
   *(Testes nas Tasks 4 e 3.)*

---

### Task 1: Migration de catálogo (colunas, slug, carrinho, importação, preços)

**Files:**
- Create: `supabase/migrations/20261126000001_catalogo_v2.sql`
- Create: `supabase/tests/catalogo_v2.test.sql`
- Modify: `web/types/database.ts` (regenerado)

**Interfaces:**
- Consumes: as tabelas da Fase 1, `public.is_admin()` e
  `public.is_lojista_ativo()`.
- Produces:
  - Colunas `produtos.slug text not null unique`, `produtos.ean text` e
    `produtos.cest char(7)`.
  - `public.gerar_slug(p_codigo text, p_nome text) returns text`
    (immutable): sem acentos (extensão `unaccent` no schema `extensions`),
    minúsculas, cada sequência de caracteres não `[a-z0-9]` vira `-`, sem
    `-` nas pontas, cortado em 80 caracteres.
  - Trigger `before insert or update of codigo, nome, slug` em `produtos`:
    se `slug` for nulo ou vazio, usa `gerar_slug(codigo, nome)`. Se o slug
    já existir em outra linha, acrescenta `-2`, `-3` etc. Preenche as
    linhas existentes.
  - Check `produtos.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`.
  - Checks: `ean ~ '^(\d{8}|\d{12,14})$'`, `cest ~ '^\d{7}$'` e
    `ncm ~ '^\d{8}$'` (todos permitem null).
  - `public.precos_cliente(p_produto_ids uuid[]) returns table(produto_id uuid, preco_tabela numeric, desconto_percentual numeric, preco_final numeric)`:
    security invoker, estável. Desconto = exceção em
    `lojista_descontos_produto` para `auth.uid()`; senão,
    `lojistas.desconto_percentual`; senão, 0. Não retorna linhas para
    visitante, para cliente desativado, nem para produto sem preço.
  - `public.carrinho_adicionar(p_produto_id uuid, p_quantidade int) returns int`:
    security invoker. Faz
    `insert … on conflict (lojista_id, produto_id) do update set quantidade = least(9999, atual + p_quantidade)`.
    Retorna a quantidade final. Lança `quantidade_invalida` se
    `p_quantidade` estiver fora de 1–9999.
  - Policy do carrinho: nova `WITH CHECK` exigindo que `produto_id` esteja
    ativo (recriar a policy `carrinho_itens_proprio` em migration nova).
  - `public.admin_importar_produtos(p jsonb) returns jsonb`: security
    definer. Exige `is_admin()`; se não for admin, lança `nao_autorizado`.
    - Entrada: array de objetos
      `{codigo, nome, preco, ativo, destaque, compatibilidade, descricao, aplicacoes, ncm, cest, ean, origem, unidade, peso_kg, altura_cm, largura_cm, comprimento_cm, manual_url, especificacoes:[{nome,valor}], imagens:[{url,alt}]}`.
    - Faz upsert por `codigo`.
    - Substitui as especificações e as imagens (`ordem` = índice) de cada
      código importado.
    - Faz upsert de `produto_precos` quando `preco` não é null. Quando
      `preco` é null, apaga o preço.
    - Tudo em uma única transação.
    - Retorna `{"criados": n, "atualizados": m}`.

- [ ] **Step 1: Write the failing pgTAP tests** em `supabase/tests/catalogo_v2.test.sql`, com fixtures próprias (produtos P ativo preço 100, Q inativo, R ativo sem preço; lojistas `l1` ativo com desconto geral 10 e exceção 5 em P, `l3` desativado):
  - `gerar_slug('NX 3631445','Placa controladora — potência LT15F')` = `'nx-3631445-placa-controladora-potencia-lt15f'`
  - inserir dois produtos com o mesmo código+nome em slug: o segundo recebe sufixo `-2`
  - insert com `ean = '123'` lança `check_violation`
  - como `l1`: `precos_cliente(array[P])` → `preco_tabela 100, desconto_percentual 5, preco_final 95.00`
  - como `l1`: produto com preço `33.33` e desconto 10 → `preco_final 30.00`
  - como `l1`: `precos_cliente(array[R])` → 0 linhas; como `l3` e como anônimo: `precos_cliente(array[P])` → 0 linhas
  - como `l1`: `carrinho_adicionar(P,2)` depois `carrinho_adicionar(P,3)` → retorna 5; `carrinho_adicionar(P,0)` lança `quantidade_invalida`; `carrinho_adicionar(P,99999)` lança `quantidade_invalida`
  - como `l1`: `carrinho_adicionar(Q,1)` (inativo) lança erro de RLS (`42501`)
  - como `l1`: `admin_importar_produtos('[]')` lança `nao_autorizado`
  - como admin: importar `[{codigo:'IMP1', nome:'Importado', preco:10, especificacoes:[{nome:'A',valor:'1'},{nome:'B',valor:'2'}], imagens:[{url:'https://x/a.jpg'}]}]` → `{"criados":1,"atualizados":0}`; reimportar com `preco:null` e uma especificação → `{"criados":0,"atualizados":1}`, 1 especificação, sem linha em `produto_precos`
  - `execute` em `precos_cliente` negado para `anon` (`has_function_privilege`)

- [ ] **Step 2: Run tests to verify they fail**
Run: `npm run db:reset && npm run db:test`
Expected: FAIL em `catalogo_v2.test.sql` (as funções não existem).

- [ ] **Step 3: Implement the migration** `supabase/migrations/20261126000001_catalogo_v2.sql` com exatamente as interfaces acima.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npm run db:reset && npm run db:test`
Expected: todos os arquivos PASS, incluindo os 85 testes antigos.

- [ ] **Step 5: Regenerate types and commit**
Run: `npm run db:types`
```bash
git add supabase/migrations/20261126000001_catalogo_v2.sql supabase/tests/catalogo_v2.test.sql web/types/database.ts
git commit -m ":sparkles: feat: Slug, EAN/CEST, preços do cliente, carrinho_adicionar e importação de produtos no banco"
```

### Task 2: Migration de pedido (cálculo, cupom, criar pedido, status)

**Files:**
- Create: `supabase/migrations/20261126000002_pedido.sql`
- Create: `supabase/tests/pedido.test.sql`
- Modify: `web/types/database.ts` (regenerado)

**Interfaces:**
- Consumes: Task 1 (`precos_cliente` e a regra de desconto por unidade).
- Produces:
  - Colunas `pedidos.observacao text check (char_length(observacao) <= 500)`
    e `pedidos.notificado_em timestamptz`.
  - Tabela `public.pedido_eventos`:
    - colunas: `id uuid pk`, `pedido_id uuid not null references pedidos on delete cascade`,
      `status_de pedido_status`, `status_para pedido_status not null`,
      `admin_id uuid references auth.users on delete set null`,
      `criado_em timestamptz not null default now()`;
    - RLS: admin lê tudo; o cliente lê os eventos dos próprios pedidos **sem
      `admin_id`**: grant de select só em
      `(id, pedido_id, status_de, status_para, criado_em)` para
      `authenticated`, mais uma policy de dono via `pedidos.lojista_id`;
    - sem insert/update/delete para `authenticated`.
  - `public.simular_pedido(p_cupom text default null) returns jsonb`:
    security definer, sempre para `auth.uid()`. Formato exato:
    ```json
    {
      "itens": [{"produto_id": "uuid", "codigo": "", "nome": "", "quantidade": 1,
                 "preco_tabela": 0, "desconto_percentual": 0, "preco_unitario": 0,
                 "total_linha": 0, "valido": true, "motivo": null}],
      "subtotal": 0, "desconto_cliente": 0, "desconto_cupom": 0,
      "desconto_aplicado": 0, "desconto_origem": "nenhum|cliente|cupom",
      "frete": 0, "icms": 0, "difal": 0, "total": 0,
      "cupom": {"codigo": null, "situacao": "ausente|aplicado|pior|invalido",
                "motivo": null, "valor_minimo": null},
      "bloqueios": []
    }
    ```
    - `itens[].motivo`: `null`, `"inativo"` ou `"sem_preco"`.
    - `cupom.motivo`: `null`, `"inexistente"`, `"inativo"`,
      `"fora_validade"`, `"esgotado"`, `"ja_usado"` ou `"valor_minimo"`.
      Cupom de outro cliente responde `"inexistente"`.
    - `bloqueios` (array de strings): `"conta_inativa"`, `"carrinho_vazio"`,
      `"sem_endereco"` e `"itens_invalidos"`.
    - Itens inválidos ficam fora de subtotal e total.
    - Quando o cupom vence (`situacao = "aplicado"`), os itens mostram
      `desconto_percentual 0`, `preco_unitario = preco_tabela`, e
      `desconto_aplicado = desconto_cupom`.
    - Todos os valores são numéricos com 2 casas.
    - O cálculo vive numa função interna
      `public._calcular_pedido(p_lojista uuid, p_cupom text) returns jsonb`,
      sem execute para ninguém além do owner. `simular_pedido` e
      `criar_pedido` chamam essa função.
  - `public.criar_pedido(p_cupom text default null, p_observacao text default null) returns jsonb`:
    security definer.
    - Trava as linhas do carrinho do cliente (`for update`) e, se houver
      cupom, a linha do cupom (`for update`).
    - Recalcula com `_calcular_pedido`.
    - Se houver bloqueio, retorna `{"ok": false, "erro": "<primeiro bloqueio>"}`.
    - Se o cupom informado tiver `situacao = "invalido"`, retorna
      `{"ok": false, "erro": "cupom_invalido", "motivo": "<motivo>"}`.
    - Observação acima de 500 caracteres:
      `{"ok": false, "erro": "observacao_longa"}`.
    - Se der tudo certo:
      - insere em `pedidos`, com snapshot de `lojistas`, `desconto_origem`,
        `cupom_id` (só quando o cupom foi aplicado), `gateway_provider 'manual'`
        e `observacao` com trim (vazia vira null);
      - insere `pedido_itens` só com os itens válidos;
      - apaga o carrinho;
      - retorna `{"ok": true, "id": "uuid", "numero": 123}`.
  - `public.calcular_impostos(p_uf_destino char(2), p_indicador_ie public.indicador_ie, p_base numeric) returns table(icms numeric, difal numeric)`:
    retorna `(0, 0)`. Esqueleto, chamado por `_calcular_pedido`.
  - `public.admin_atualizar_pedido(p_pedido_id uuid, p_status public.pedido_status default null, p_nota_id text default null, p_nota_url text default null) returns void`:
    security definer, exige `is_admin()` (senão lança `nao_autorizado`).
    - Se `p_status` não for null e for diferente do atual, valida a
      transição (senão lança `transicao_invalida`), atualiza e insere em
      `pedido_eventos` com `admin_id = auth.uid()`.
    - Atualiza `maino_nota_id`/`maino_nota_url` quando informados
      (string vazia vira null).
    - `p_nota_url`, quando não for null nem vazio, precisa começar com
      `https://` (senão lança `url_invalida`).
  - `public.marcar_pedido_notificado(p_pedido_id uuid) returns void`: faz
    `notificado_em = now()`; execute só para `service_role`.

- [ ] **Step 1: Write the failing pgTAP tests** em `supabase/tests/pedido.test.sql`. Fixtures próprias: P1 preço 100, P2 preço 50, lojista `l1` (endereço completo, desconto geral 10%), `l2` (endereço completo, sem desconto), `l4` (ativo e sem endereço) e cupons `C10P` (10%), `C30V` (valor 30), `CMIN` (5%, mínimo 1000), `CEXP` (`valido_ate` ontem), `CLIM` (`max_usos` 1), `CL2` (só `l2`). Casos:
  - `l1`, carrinho P1×2, sem cupom → subtotal 200.00, desconto_cliente 20.00, desconto_origem `cliente`, total 180.00
  - `l1` com `C30V` → desconto_cupom 30.00 > 20.00 → situacao `aplicado`, total 170.00, itens com desconto_percentual 0
  - `l1` com `c10p` (minúsculo) → 20.00 = 20.00 → situacao `pior`, origem `cliente`, total 180.00
  - `l2` com `C10P` → aplicado, total 180.00
  - `l2` com cupom de valor 500 em carrinho de 200 → desconto_cupom 200.00, total 0.00
  - motivos: `CMIN`→`valor_minimo` (com `valor_minimo` 1000.00), `CEXP`→`fora_validade`, `NAOEXISTE`→`inexistente`, `CL2` usado por `l1`→`inexistente`
  - item inativo no carrinho → item `valido false` com motivo `inativo`, bloqueio `itens_invalidos`, fora do subtotal
  - `l4` → bloqueio `sem_endereco`; carrinho vazio → `carrinho_vazio`
  - `criar_pedido` de `l2` com `C10P` → ok; o pedido tem cupom_id, desconto_origem `cupom`, total 180.00, snapshot do documento/nome/UF de `l2`, status `aguardando_pagamento`, gateway_provider `manual`; o carrinho de `l2` fica vazio
  - segunda chamada imediata de `criar_pedido` por `l2` → `{"ok":false,"erro":"carrinho_vazio"}` (Review Focus 1)
  - `l2` com um novo carrinho e de novo `C10P` → `cupom_invalido`/`ja_usado`
  - `CLIM`: usado por `l2` (ok); depois `l1` → `cupom_invalido`/`esgotado`; o pedido de `l2` vira `cancelado` (via admin) → `l1` consegue
  - `l1` com `C10P` pior → pedido gravado com `cupom_id` null
  - observação com 501 caracteres → `observacao_longa`
  - `l1` não lê pedidos de `l2`; `l1` lê `pedido_eventos` do próprio pedido, mas `select admin_id` dá `42501`
  - `admin_atualizar_pedido` como `l1` → `nao_autorizado`; como admin, `aguardando_pagamento→entregue` → `transicao_invalida`; `aguardando_pagamento→pago` grava 1 evento com `admin_id`; nota_url `http://x` → `url_invalida`
  - `execute` em `criar_pedido` negado a `anon`; `marcar_pedido_notificado` negado a `authenticated`

- [ ] **Step 2: Run tests to verify they fail**
Run: `npm run db:reset && npm run db:test`
Expected: FAIL em `pedido.test.sql`.

- [ ] **Step 3: Implement** `supabase/migrations/20261126000002_pedido.sql` com as interfaces acima.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npm run db:reset && npm run db:test`
Expected: tudo PASS.

- [ ] **Step 5: Regenerate types and commit**
Run: `npm run db:types`
```bash
git add supabase/migrations/20261126000002_pedido.sql supabase/tests/pedido.test.sql web/types/database.ts
git commit -m ":sparkles: feat: Cálculo do pedido com vale o maior, cupom, criar_pedido e status do pedido no banco"
```

### Task 3: Base do servidor (client público, e-mail, contato, flags, trava de build, rodapé)

**Files:**
- Create: `web/lib/supabase/publico.ts`
- Create: `web/lib/email/enviar.ts`, `web/lib/email/enviar.test.ts`
- Create: `web/lib/email/html.ts` (`escaparHtml`), `web/lib/email/html.test.ts`
- Create: `web/lib/contato/validar.ts`, `web/lib/contato/validar.test.ts`
- Create: `web/lib/contato/limite.ts`, `web/lib/contato/limite.test.ts`
- Create: `web/services/contato.ts`
- Create: `web/lib/formatar.ts` (`formatarMoeda`), `web/lib/formatar.test.ts`
- Modify: `web/components/ContactForm.tsx` (usa a Server Action com `useActionState`; honeypot `name="empresa_site"`, invisível e com `tabIndex={-1}`)
- Modify: `web/lib/flags.ts`
- Modify: `web/lib/build/verificar-producao.mjs`, `web/lib/build/verificar-producao.test.ts`
- Modify: `web/messages/{pt,en,es}.json` (remover `footer.address`; mensagens novas do contato), `web/components/Footer.tsx` (remover a linha do endereço), `web/e2e/legal.spec.ts` (remover a asserção de `TODO_ENDERECO`)
- Modify: `web/.env.example`

**Interfaces:**
- Produces:
  - `createPublicClient(): SupabaseClient<Database>`: cliente anon sem
    sessão (`persistSession: false`). O `global.fetch` acrescenta
    `next: { revalidate: 3600, tags: ["catalogo"] }`.
  - `escaparHtml(s: string): string`: escapa `& < > " '`.
  - `enviarEmail(m: { para: string; assunto: string; html: string; texto: string; responderPara?: string }): Promise<{ ok: boolean }>`:
    - faz `POST https://api.resend.com/emails` com
      `Authorization: Bearer RESEND_API_KEY`;
    - retorna `ok:false` quando a resposta não é 2xx ou dá erro de rede, sem
      lançar exceção;
    - sem chave e fora de produção, simula conforme as Global Constraints.
  - `validarContato(d: { nome: string; email: string; telefone?: string; mensagem: string; empresa_site?: string }): { ok: true; dados: {...} } | { ok: false; erros: Partial<Record<"nome"|"email"|"mensagem", string>> } | { ok: "spam" }`:
    - nome com 2 a 100 caracteres;
    - e-mail válido;
    - mensagem com 10 a 2000 caracteres;
    - honeypot preenchido retorna `"spam"`.
  - `permitirEnvio(chave: string, agora?: number): boolean`: no máximo 5
    por hora por chave, guardado em um `Map` em memória.
  - `enviarContato(prev, formData): Promise<{ estado: "ok" | "erro" | "invalido"; erros?: ... }>`:
    "use server".
    - Spam retorna `"ok"` sem enviar.
    - Envia para `contato@nexcontrols.com`, com `responderPara` igual ao
      e-mail do visitante e o conteúdo escapado.
    - A chave do limite é o IP de `x-forwarded-for`.
  - `formatarMoeda(valor: number, locale: string): string`: sempre BRL
    (`Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })`).
  - `flags`: adicionar
    `pagamentoOnline: process.env.FEATURE_PAGAMENTO_ONLINE === "true"` e
    `nfeAutomatica: process.env.FEATURE_NFE_AUTOMATICA === "true"`.
  - Trava de build (`verificarProducao`):
    - `VARIAVEIS_OBRIGATORIAS` passa a incluir `RESEND_API_KEY`,
      `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e
      `CLOUDINARY_API_SECRET`;
    - nova regra: se `env.FEATURE_PAGAMENTO_ONLINE === "true"` e
      `mensagens.pt.footer.address` estiver ausente ou vazio, o problema é
      `"Endereço físico da empresa (footer.address) é obrigatório com pagamento online (Decreto 7.962/2013)."`

- [ ] **Step 1: Write the failing Vitest tests**
  - `escaparHtml('<img src=x onerror="a">')` → `'&lt;img src=x onerror=&quot;a&quot;&gt;'` (Review Focus 5)
  - `enviarEmail` com `fetch` mockado com 200 → `{ok:true}` e o body JSON tem `from`, `to:[para]`, `subject`, `html`, `text` e `reply_to` quando informado; com 500 → `{ok:false}`; sem chave e `VERCEL_ENV` diferente de production → `fetch` não é chamado e retorna `{ok:true}`
  - `validarContato`: nome de 1 caractere → erro em `nome`; e-mail `a@` → erro em `email`; honeypot `"x"` → `{ok:"spam"}`; caso válido → `ok:true`, com os campos trimados
  - `permitirEnvio("ip", t)` 5 vezes → `true`; na 6ª → `false`; com `t + 3600001` → `true`
  - `formatarMoeda(1234.5, "pt")` → `"R$ 1.234,50"` (com espaço não separável normalizado na asserção)
  - trava de build: env de produção completo + `FEATURE_PAGAMENTO_ONLINE=true` + mensagens sem `footer.address` → contém o problema do Decreto; sem a flag → sem esse problema; faltando `RESEND_API_KEY` → problema de variável ausente

- [ ] **Step 2: Run** `cd web && npm test`. Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implement** os módulos acima e ajuste `ContactForm.tsx`, `Footer.tsx`, as mensagens, `legal.spec.ts` e `.env.example`. O `.env.example` ganha `RESEND_API_KEY=`, `EMAIL_REMETENTE=`, `EMAIL_PEDIDOS_DESTINO=`, `CLOUDINARY_CLOUD_NAME=`, `CLOUDINARY_API_KEY=`, `CLOUDINARY_API_SECRET=`, `FEATURE_PAGAMENTO_ONLINE=false` e `FEATURE_NFE_AUTOMATICA=false`.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add web
git commit -m ":sparkles: feat: Envio de e-mail via Resend, contato sem Strapi, flags de pagamento/NF-e e trava de build atualizada"
```

### Task 4: Catálogo público no Supabase (lista, detalhe, ilha de preço)

**Files:**
- Create: `web/services/catalogo.ts`
- Create: `web/src/app/[locale]/catalogo/page.tsx`
- Create: `web/src/app/[locale]/catalogo/[slug]/page.tsx` (substitui `catalogo/[id]/page.tsx`, que é apagado)
- Create: `web/components/catalogo/TextoProduto.tsx`, `web/components/catalogo/TextoProduto.test.tsx`
- Create: `web/components/catalogo/PrecoProduto.tsx` ("use client")
- Create: `web/components/catalogo/BuscaCatalogo.tsx` ("use client")
- Create: `web/components/carrinho/IconeCarrinho.tsx` ("use client")
- Create: `web/services/carrinho.ts` (só `adicionarAoCarrinho` nesta task)
- Modify: `web/components/ProductCard.tsx`, `web/components/ProdutoDetalhe.tsx`, `web/components/CatalogoSection.tsx`, `web/src/app/[locale]/page.tsx`, `web/components/Navbar.tsx` (inclui `IconeCarrinho` junto do `MenuUsuario`)
- Delete: `web/services/strapi.ts`, `web/types/Produto.ts`, a dependência `@strapi/blocks-react-renderer` e o host `nex-controls.onrender.com` em `next.config.ts`
- Modify: `web/messages/{pt,en,es}.json`
- Test: `web/e2e/catalogo.spec.ts`; `web/e2e/fixtures.ts` (adicionar `criarProduto`)

**Interfaces:**
- Consumes: `createPublicClient()` (Task 3), `precos_cliente` e
  `carrinho_adicionar` (Task 1), `formatarMoeda` (Task 3).
- Produces:
  - Tipo `ProdutoPublico = { id: string; slug: string; codigo: string; nome: string; destaque: string | null; compatibilidade: string | null; descricao: string | null; aplicacoes: string | null; manual_url: string | null; imagens: { url: string; alt: string | null }[]; especificacoes: { nome: string; valor: string }[] }`,
    exportado de `web/services/catalogo.ts`.
  - `listarProdutosPublicos(): Promise<ProdutoPublico[]>` (ativos, por
    `codigo`) e `obterProdutoPorSlug(slug: string): Promise<ProdutoPublico | null>`,
    com imagens e especificações em uma única consulta com join, ordenadas
    por `ordem`.
  - `adicionarAoCarrinho(produtoId: string, quantidade: number): Promise<{ ok: true; quantidade: number } | { ok: false; erro: "nao_logado" | "quantidade_invalida" | "indisponivel" }>`:
    "use server", com client de `@/lib/supabase/server` e RPC
    `carrinho_adicionar`.
  - `IconeCarrinho`:
    - client do navegador; com sessão de lojista (`app_metadata.papel === "lojista"`),
      mostra um link para `/{locale}/cliente/carrinho` com a soma das
      quantidades do carrinho (`carrinho_itens`);
    - ouve o evento `window` `"carrinho:atualizado"` para recontar.
    - `PrecoProduto` dispara esse evento depois de adicionar.
  - Página `/[locale]/catalogo/[slug]`: `generateStaticParams` com os slugs
    ativos e `revalidate = 3600`. `notFound()` quando não existe.
  - `PrecoProduto` (props `{ produtoId: string }`):
    - estado inicial: skeleton com altura fixa (sem CLS);
    - sem sessão: texto `catalog.precoLogin` com link para o login (com
      `next` apontando para a página atual);
    - sessão de admin: nada;
    - lojista com 0 linhas de `precos_cliente`: chama `is_lojista_ativo`
      via RPC. Se for falso, mostra `catalog.contaInativa`; se for
      verdadeiro, mostra `catalog.sobConsulta`;
    - com preço: preço de tabela riscado (só se o desconto for maior que 0),
      preço final, campo de quantidade (1–9999) e botão
      `catalog.adicionar`;
    - feedback depois de adicionar: `catalog.adicionado`, com link
      `catalog.verCarrinho`.
  - `TextoProduto` (props `{ texto: string | null }`):
    - parágrafos separados por linha em branco;
    - um bloco em que todas as linhas começam com `- ` vira `<ul>`.

- [ ] **Step 1: Write failing tests**
  - Vitest (`TextoProduto.test.tsx`, com `@testing-library/react` se já estiver no projeto; senão `react-dom/server` `renderToStaticMarkup`):
    - `"a\n\nb"` → 2 `<p>`;
    - `"- x\n- y"` → `<ul>` com 2 `<li>`;
    - `"<script>alert(1)</script>"` → o markup contém `&lt;script&gt;` (Review Focus 5).
  - Playwright `e2e/catalogo.spec.ts` (fixture `criarProduto({ codigo, nome, preco, manual_url, especificacoes })`, que grava via service role e retorna `{ id, slug }`):
    - visitante abre `/pt/catalogo`, vê o produto e não vê `R$`;
    - visitante abre o detalhe e vê a especificação, e o link do manual tem o `href` igual a `manual_url`;
    - lojista com desconto de 10% vê `R$ 90,00` e o riscado `R$ 100,00`, adiciona 2 unidades e o ícone do carrinho mostra 2;
    - lojista desativado vê o texto de conta inativa;
    - quantidade `0` deixa o botão desabilitado e não chama a action (Review Focus 4).
  - Depois de publicar um produto pelo admin, a página não é testada com ISR no e2e. O `next start` local respeita a revalidação por tag; a revalidação é coberta na Task 5.

- [ ] **Step 2: Run** `cd web && npm test` e `npm run e2e -- catalogo.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** os arquivos acima. `CatalogoSection` mostra os primeiros 8 produtos e um link "ver catálogo completo". `BuscaCatalogo` filtra por nome e código, sem diferenciar maiúsculas e acentos.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit && npm run e2e`. Expected: PASS (os specs antigos continuam verdes).

- [ ] **Step 5: Commit**
```bash
git add -A web
git commit -m ":sparkles: feat: Catálogo público vindo do Supabase, preço do cliente e adicionar ao carrinho; remove Strapi do site"
```

### Task 5: Admin de produtos (CRUD, especificações, imagens e manual no Cloudinary)

**Files:**
- Create: `web/lib/cloudinary/assinatura.ts`, `web/lib/cloudinary/assinatura.test.ts`
- Create: `web/services/produtos-admin.ts`, `web/services/produtos-admin.test.ts`
- Create: `web/src/app/[locale]/admin/produtos/page.tsx`, `novo/page.tsx` e `[id]/page.tsx`
- Create: `web/components/admin/FormProduto.tsx`, `web/components/admin/UploadCloudinary.tsx` ("use client")
- Modify: `web/src/app/[locale]/admin/layout.tsx` (navegação: Clientes, Produtos, Cupons, Pedidos; os links de Cupons e Pedidos ficam prontos para as Tasks 7 e 9)
- Test: `web/e2e/admin-produtos.spec.ts`

**Interfaces:**
- Consumes: as colunas da Task 1 (slug, ean, cest, a trigger de slug),
  `exigirAdmin`, `createAdminClient` e `ResultadoAdmin`.
- Produces:
  - `assinarCloudinary(params: Record<string, string | number>, segredo: string): string`:
    SHA-1 hex de `chaves ordenadas "k=v" unidas por "&"` seguido do
    segredo.
  - `assinarUpload(tipo: "image" | "raw"): Promise<ResultadoAdmin<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string; resourceType: "image" | "raw"; maxBytes: number }>>`
    ("use server", `exigirAdmin`).
  - `ProdutoAdmin = { id; codigo; nome; slug; ativo; preco: number | null; destaque; compatibilidade; descricao; aplicacoes; ncm; cest; ean; origem; unidade; peso_kg; altura_cm; largura_cm; comprimento_cm; manual_url; imagens: {url; alt}[]; especificacoes: {nome; valor}[] }`.
  - `listarProdutosAdmin(busca?: string): Promise<Pick<ProdutoAdmin, "id"|"codigo"|"nome"|"ativo"|"preco">[]>`,
    `obterProdutoAdmin(id: string): Promise<ProdutoAdmin | null>` e
    `salvarProduto(prev, formData): Promise<ResultadoAdmin<{ id: string }>>`
    (cria ou atualiza; `id` vazio cria).
  - `salvarProduto` grava produto, preço, especificações e imagens pela
    RPC `admin_importar_produtos` com um único item (reuso da Task 1). As
    especificações e imagens vêm do form como JSON em campos hidden
    `especificacoes_json` e `imagens_json`.
  - Depois de salvar: `revalidateTag("catalogo")` e
    `revalidatePath("/[locale]/admin", "layout")`.
  - Validação no servidor:
    - código e nome obrigatórios;
    - NCM com 8 dígitos, CEST com 7, EAN com 8/12/13/14;
    - origem de 0 a 8;
    - preço maior ou igual a 0, aceitando vírgula;
    - slug no formato `^[a-z0-9]+(-[a-z0-9]+)*$` quando preenchido;
    - URLs `https://`.
  - Mensagens de erro em português, por exemplo
    `"NCM inválido: informe 8 dígitos."`
  - `UploadCloudinary` (props `{ tipo: "image" | "raw"; aoEnviar: (url: string) => void }`):
    - recusa arquivo maior que `maxBytes` antes de enviar (mensagem
      `"Arquivo maior que 5 MB."` ou `"Arquivo maior que 20 MB."`);
    - faz POST em `https://api.cloudinary.com/v1_1/{cloudName}/{resourceType}/upload`
      com `file`, `api_key`, `timestamp`, `folder` e `signature`;
    - usa a `secure_url`.
  - A edição de produto também permite trocar o slug.

- [ ] **Step 1: Write failing tests**
  - `assinarCloudinary({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" }, "abcd")` → `"bfd09f95f331f558cbd1320e67aa8d488770583e"` (exemplo da documentação do Cloudinary)
  - `produtos-admin.test.ts` (mock de `exigirAdmin` e do client, no mesmo padrão de `lojistas-admin.test.ts`): NCM `"8537109"` → erro de NCM; preço `"189,90"` → RPC chamada com `preco: 189.9`; sem admin → `exigirAdmin` lança e nada é gravado
  - e2e `admin-produtos.spec.ts`: admin cria o produto `ADM1` com preço `250,00`, uma especificação e um manual por URL `https://res.cloudinary.com/demo/raw/upload/manual.pdf`; o produto aparece na lista; um lojista vê `R$ 250,00` no detalhe público (prova a revalidação por tag)

- [ ] **Step 2: Run** `cd web && npm test` e `npm run e2e -- admin-produtos.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** os arquivos acima. Na lista, há busca por código ou nome e o badge ativo/inativo.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit && npm run e2e`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A web
git commit -m ":sparkles: feat: Admin de produtos com especificações, preço e upload de imagens/manual no Cloudinary"
```

### Task 6: Importação de produtos por planilha

**Files:**
- Create: `web/lib/importacao/ler-planilha.ts`, `web/lib/importacao/ler-planilha.test.ts`
- Create: `web/lib/importacao/fixtures/` (planilhas de teste geradas no próprio teste com `exceljs`)
- Create: `web/services/importacao-admin.ts`
- Create: `web/src/app/[locale]/admin/produtos/importar/page.tsx`, `web/components/admin/ImportarPlanilha.tsx` ("use client")
- Modify: `web/package.json` (dependência `exceljs`, versão exata; usado só no servidor)
- Modify: `web/src/app/[locale]/admin/produtos/page.tsx` (botão "Importar planilha")

**Interfaces:**
- Consumes: `admin_importar_produtos` (Task 1), o modelo
  `web/public/modelos/modelo-produtos.xlsx` (abas `Produtos`,
  `Especificacoes`, `Imagens`, `Instrucoes`, cabeçalhos na linha 1).
- Produces:
  - `lerPlanilha(buffer: ArrayBuffer): Promise<{ produtos: ProdutoImportado[]; erros: { aba: string; linha: number; mensagem: string }[]; pendencias: { codigo: string; arquivo: string; tipo: "imagem" | "manual" }[] }>`.
  - `ProdutoImportado` tem exatamente o formato de item de
    `admin_importar_produtos`.
  - A coluna é localizada pelo **texto do cabeçalho**, sem o sufixo ` *`
    e o que vem entre parênteses (`"preco (R$)"` → `preco`,
    `"manual (link ou arquivo)"` → `manual`,
    `"codigo do produto *"` → `codigo`,
    `"imagem * (link ou arquivo)"` → `imagem`,
    `"texto alternativo"` → `alt`).
  - Normalização (Review Focus 2):
    - número em NCM/CEST/EAN/código vira string inteira, sem notação
      científica;
    - NCM com 7 dígitos ganha zero à esquerda;
    - preço `"189,90"`, `"R$ 189,90"`, `"1.234,50"` e número viram number;
    - `ativo` aceita SIM/NAO/NÃO, sem diferenciar maiúsculas (vazio vale
      `true`);
    - `origem` vazia vale 0 e `unidade` vazia vale `"UN"`.
  - `manual`/`imagem` com `https://` vão para `manual_url`/`imagens[].url`.
    Sem `https://`, viram uma `pendencia` e não são gravados (o manual fica
    null e a imagem é omitida).
  - Validações por linha, com as mesmas mensagens da Task 5:
    - código duplicado na aba Produtos;
    - especificação ou imagem com código que não está na aba Produtos;
    - linha totalmente vazia é ignorada.
  - `previaImportacao(formData): Promise<ResultadoAdmin<{ novos: string[]; atualizados: string[]; erros: ...; pendencias: ... }>>`
    e `confirmarImportacao(formData): Promise<ResultadoAdmin<{ criados: number; atualizados: number; pendencias: ... }>>`
    ("use server", `exigirAdmin`). O arquivo tem no máximo 5 MB e precisa
    ser `.xlsx`.
    - `confirmarImportacao` relê o arquivo (não confia na prévia), recusa
      se houver erros, chama a RPC e faz `revalidateTag("catalogo")`.
  - Tela: link para baixar o modelo (`/modelos/modelo-produtos.xlsx`),
    input de arquivo, prévia (tabelas de novos, atualizados, erros e
    pendências) e botão "Importar" desabilitado quando há erros.

- [ ] **Step 1: Write failing Vitest tests** (planilhas montadas com `exceljs` em memória):
  - o modelo real `web/public/modelos/modelo-produtos.xlsx` → 1 produto `NX 3631445`, 5 especificações, `ean "7898713250934"`, 0 erros, pendências: 3 imagens + 1 manual
  - NCM numérico `8537109` → `"08537109"`; EAN numérico `7898713250934` → `"7898713250934"`; preço texto `"1.234,50"` → `1234.5`; preço numérico `189.9` → `189.9`
  - `ativo "não"` → `false`
  - NCM `"123"` → erro `{ aba: "Produtos", linha: 2, mensagem: "NCM inválido: informe 8 dígitos." }`
  - código repetido em duas linhas → erro na segunda
  - especificação com código inexistente → erro na aba `Especificacoes`
  - cabeçalhos em outra ordem continuam funcionando

- [ ] **Step 2: Run** `cd web && npm test`. Expected: FAIL.

- [ ] **Step 3: Implement** os arquivos acima.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A web
git commit -m ":sparkles: feat: Importação de produtos por planilha com prévia, normalização e pendências de arquivo"
```

### Task 7: Admin de descontos por produto e cupons

**Files:**
- Create: `web/services/descontos-admin.ts`, `web/services/cupons-admin.ts`, `web/services/cupons-admin.test.ts`
- Create: `web/components/admin/DescontosProduto.tsx`, `web/components/admin/FormCupom.tsx`
- Create: `web/src/app/[locale]/admin/cupons/page.tsx`, `novo/page.tsx` e `[id]/page.tsx`
- Modify: `web/src/app/[locale]/admin/lojistas/[id]/page.tsx` (seção "Descontos por produto" abaixo do formulário)
- Test: `web/e2e/admin-cupons.spec.ts`

**Interfaces:**
- Consumes: as tabelas `lojista_descontos_produto` e `cupons` (Fase 1),
  `listarProdutosAdmin` (Task 5).
- Produces:
  - `listarDescontosProduto(lojistaId: string): Promise<{ produto_id: string; codigo: string; nome: string; desconto_percentual: number }[]>`,
    `definirDescontoProduto(lojistaId: string, produtoId: string, percentual: string): Promise<ResultadoAdmin>`
    (upsert; aceita vírgula; de 0 a 100) e
    `removerDescontoProduto(lojistaId: string, produtoId: string): Promise<ResultadoAdmin>`.
  - `CupomAdmin = { id; codigo; tipo: "percentual" | "valor"; valor: number; valor_minimo_pedido: number | null; valido_de: string | null; valido_ate: string | null; max_usos: number | null; lojista_id: string | null; ativo: boolean; usos: number }`.
    `usos` conta os pedidos não cancelados.
  - `listarCupons()`, `obterCupom(id)` e
    `salvarCupom(prev, formData): Promise<ResultadoAdmin<{ id: string }>>`.
    - O código é gravado em MAIÚSCULAS e trimado, com o formato
      `^[A-Z0-9_-]{3,30}$`.
    - Percentual de 0 a 100 (exclusivo no 0).
    - `valido_ate` maior ou igual a `valido_de`.
    - Código duplicado → `"Já existe um cupom com este código."`
  - `definirCupomAtivo(id: string, ativo: boolean): Promise<ResultadoAdmin>`.
    Cupom nunca é apagado.
  - O cliente do cupom é escolhido num select com os lojistas não
    anonimizados (opção "Todos os clientes").

- [ ] **Step 1: Write failing tests**
  - `cupons-admin.test.ts`: código `" promo10 "` → gravado `"PROMO10"`; código `"a"` → erro; percentual `"150"` → erro; `valido_ate` anterior a `valido_de` → erro
  - e2e `admin-cupons.spec.ts`: admin cria o cupom `NATAL10` (10%), que aparece na lista com `0 / ilimitado`; desativa e ele aparece como inativo; admin define 15% para o produto `P` na página do lojista e a linha aparece

- [ ] **Step 2: Run** `cd web && npm test` e `npm run e2e -- admin-cupons.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit && npm run e2e`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A web
git commit -m ":sparkles: feat: Admin de descontos por produto e de cupons"
```

### Task 8: Carrinho, gerar pedido e e-mails do pedido

**Files:**
- Create: `web/src/app/[locale]/cliente/(area)/carrinho/page.tsx`
- Create: `web/components/carrinho/Carrinho.tsx` ("use client"), `web/components/carrinho/ResumoPedido.tsx`
- Create: `web/lib/email/pedido.ts`, `web/lib/email/pedido.test.ts`
- Create: `web/lib/carrinho/mensagens.ts`, `web/lib/carrinho/mensagens.test.ts`
- Create: `web/services/pedidos.ts` (`notificarPedido`, server-only)
- Modify: `web/services/carrinho.ts` (acrescenta as actions abaixo)
- Modify: `web/components/conta/NavConta.tsx` (item "Carrinho"), `web/messages/{pt,en,es}.json`
- Test: `web/e2e/pedido.spec.ts`

**Interfaces:**
- Consumes: `simular_pedido`, `criar_pedido` e `marcar_pedido_notificado`
  (Task 2), `enviarEmail`/`escaparHtml`/`formatarMoeda` (Task 3),
  `adicionarAoCarrinho` (Task 4).
- Produces:
  - `Simulacao`: tipo TS com o formato JSON de `simular_pedido` (Task 2),
    exportado de `web/services/carrinho.ts`.
  - `simularCarrinho(cupom?: string): Promise<Simulacao | null>` (null sem
    sessão), `atualizarQuantidade(produtoId: string, quantidade: number): Promise<{ ok: boolean; erro?: "quantidade_invalida" }>`
    (update direto em `carrinho_itens`; de 1 a 9999 validado antes)
    e `removerItem(produtoId: string): Promise<{ ok: boolean }>`.
  - `gerarPedido(cupom: string | null, observacao: string): Promise<{ ok: true; numero: number } | { ok: false; erro: string; motivo?: string }>`:
    chama `criar_pedido`. Se der certo, chama
    `await notificarPedido(id).catch(log)` (uma falha não muda o
    resultado).
  - `notificarPedido(pedidoId: string): Promise<boolean>` (server-only, em
    `web/services/pedidos.ts`):
    - carrega o pedido, os itens e os contatos do lojista
      (telefone/whatsapp/e-mail/responsável) com `createAdminClient`;
    - monta os dois e-mails;
    - se **os dois** derem `ok`, chama `marcar_pedido_notificado` e retorna
      `true`.
  - `PedidoEmail = { numero: number; data: string; cliente: { nome; documento; tipo_pessoa; inscricao_estadual; email; telefone; whatsapp; responsavel }; entrega: { cep; logradouro; numero; complemento; bairro; cidade; uf }; itens: { codigo; nome; quantidade; preco_unitario; total_linha }[]; subtotal; desconto_valor; desconto_origem; cupom_codigo: string | null; total; observacao: string | null }`.
  - `montarEmailCliente(p: PedidoEmail): { assunto: string; html: string; texto: string }`:
    - assunto `Pedido #${numero} recebido — Nex Controls`;
    - inclui `Recebemos seu pedido. A Nex entrará em contato para combinar frete e pagamento.`,
      os itens, o desconto, `Frete: a combinar`, o total e a observação.
  - `montarEmailNex(p: PedidoEmail, linkPainel: string)`:
    - assunto `Novo pedido #${numero} — ${cliente.nome}`;
    - inclui documento, IE, endereço, contatos e o link do painel
      `${NEXT_PUBLIC_SITE_URL}/pt/admin/pedidos/${numero}`.
  - Todo texto variável é escapado com `escaparHtml` no HTML.
  - `mensagemCupom(motivo: string, valorMinimo: number | null, t)` e
    `mensagemBloqueio(bloqueio: string, t)`: mapeiam cada motivo e bloqueio
    de Task 2 para uma chave de `carrinho.*` nas mensagens. Uma chave
    desconhecida cai na mensagem genérica.
  - Página do carrinho:
    - itens com quantidade editável, preço unitário e total da linha, e
      remover;
    - itens com `valido false` aparecem marcados com o motivo
      (`carrinho.itemInativo` / `carrinho.itemSemPreco`) e só têm a ação
      remover;
    - campo de cupom com o botão "Aplicar". O cupom aplicado fica no estado
      do componente e é reenviado a cada simulação;
    - o resumo é recalculado (`simularCarrinho`) depois de **toda**
      alteração (Review Focus 3);
    - observação com contador de 500;
    - aviso e link para `/cliente/endereco` quando houver bloqueio
      `sem_endereco`;
    - "Gerar pedido" fica desabilitado com bloqueios ou durante o envio
      (Review Focus 1 também na UI);
    - se der certo, redireciona para `/{locale}/cliente/pedidos/{numero}?novo=1`.
      Essa página vem da Task 9; até lá, o e2e desta task só verifica a URL.

- [ ] **Step 1: Write failing tests**
  - `pedido.test.ts`: `montarEmailCliente` com `cliente.nome = "<b>X</b>"` e `observacao = "<script>"` → o html contém `&lt;b&gt;` e `&lt;script&gt;`, e o texto contém `Frete: a combinar` e o total `R$ 180,00`; `montarEmailNex` contém o link do painel e o documento formatado
  - `mensagens.test.ts`: cada motivo (`inexistente`, `inativo`, `fora_validade`, `esgotado`, `ja_usado`, `valor_minimo`) mapeia para uma chave existente em `messages/pt.json`; `valor_minimo` interpola `R$ 1.000,00`
  - e2e `pedido.spec.ts`:
    - lojista com desconto de 10% e 2× um produto de R$ 100: o carrinho mostra o total `R$ 180,00`; cupom `C30V` (valor 30) → total `R$ 170,00` e origem cupom; troca para o cupom percentual 5% → mensagem "Seu desconto atual já é maior" e total `R$ 180,00`
    - aplica o cupom com mínimo de R$ 150 e muda a quantidade para 1 → o cupom aparece como inválido por valor mínimo (Review Focus 3)
    - quantidade `0` no carrinho → recusada e o valor anterior fica (Review Focus 4)
    - "Gerar pedido" → URL `/pt/cliente/pedidos/<n>?novo=1`; no banco há 1 pedido com `notificado_em` preenchido (envio simulado) e o carrinho está vazio
    - lojista sem endereço vê o aviso e o botão desabilitado

- [ ] **Step 2: Run** `cd web && npm test` e `npm run e2e -- pedido.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**.

- [ ] **Step 4: Run** `cd web && npm test && npm run lint && npx tsc --noEmit && npm run e2e`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A web
git commit -m ":sparkles: feat: Carrinho com cupom vale o maior, gerar pedido e e-mails de confirmação"
```

### Task 9: Pedidos do cliente e do admin, documentação

**Files:**
- Create: `web/services/pedidos-cliente.ts`, `web/services/pedidos-admin.ts`
- Create: `web/src/app/[locale]/cliente/(area)/pedidos/page.tsx` e `[numero]/page.tsx`
- Create: `web/src/app/[locale]/admin/pedidos/page.tsx` e `[numero]/page.tsx`
- Create: `web/components/pedidos/StatusPedido.tsx` (rótulo traduzido por status), `web/components/admin/AcoesPedido.tsx` ("use client")
- Modify: `web/components/conta/NavConta.tsx` (item "Pedidos"), `web/messages/{pt,en,es}.json`
- Modify: `web/README.md`, `docs/architecture.md`
- Test: `web/e2e/pedidos.spec.ts`

**Interfaces:**
- Consumes: `admin_atualizar_pedido` (Task 2), `notificarPedido`
  (Task 8), `formatarMoeda`.
- Produces:
  - `listarMeusPedidos(): Promise<{ numero; created_at; status; total }[]>`
    e `obterMeuPedido(numero: number)`, com o client do usuário (RLS). Os
    eventos são lidos só nas colunas permitidas.
  - `listarPedidosAdmin(status?: PedidoStatus): Promise<{ numero; created_at; cliente_nome; total; status; notificado: boolean }[]>`,
    `obterPedidoAdmin(numero: number)` (snapshots, itens, eventos com o nome
    do admin vindo de `profiles.nome`),
    `atualizarPedido(prev, formData): Promise<ResultadoAdmin>` (RPC
    `admin_atualizar_pedido`; mapeia `transicao_invalida` para
    `"Mudança de status não permitida."` e `url_invalida` para
    `"O link da nota precisa começar com https://."`) e
    `reenviarEmails(numero: number): Promise<ResultadoAdmin>`
    (`notificarPedido`; se falhar, `"Não foi possível enviar os e-mails."`).
  - O `select` de status no admin mostra só o status atual e as transições
    permitidas (as mesmas das Global Constraints).
  - Detalhe do cliente:
    - com `?novo=1`, mostra um banner com `pedidos.confirmacao` ("Recebemos
      seu pedido. A Nex entrará em contato para combinar frete e
      pagamento.");
    - mostra o link da nota quando `maino_nota_url` existe.
  - `README.md`: seção "Fases 2–4" com:
    - as variáveis novas;
    - como importar a planilha;
    - o fluxo manual de pedido;
    - as flags `FEATURE_PAGAMENTO_ONLINE` e `FEATURE_NFE_AUTOMATICA`;
    - a pendência legal do endereço.
  - `architecture.md`: as funções de pedido e o lugar futuro das Edge
    Functions de Stone e Mainô.

- [ ] **Step 1: Write failing e2e** `pedidos.spec.ts` (pedido criado pela fixture via RPC `criar_pedido` com a sessão do lojista, ou pelo fluxo da Task 8):
  - o lojista vê o pedido em `/pt/cliente/pedidos` com o status "Aguardando pagamento" e abre o detalhe com os itens
  - `?novo=1` mostra o banner de confirmação
  - o admin vê o pedido em `/pt/admin/pedidos`, filtra por "Aguardando pagamento", abre o detalhe, muda para "Pago" e informa o link da nota `https://exemplo.com/nf.pdf`; o histórico mostra 1 evento
  - o lojista recarrega e vê "Pago" e o link da nota
  - o select do admin não oferece "Entregue" a partir de "Aguardando pagamento"
  - outro lojista que abre `/pt/cliente/pedidos/<n>` do primeiro vê "não encontrado"

- [ ] **Step 2: Run** `cd web && npm run e2e -- pedidos.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** os arquivos e a documentação.

- [ ] **Step 4: Run the full suite**
Run, da raiz: `npm run db:reset && npm run db:test`; em `web/`: `npm test && npm run lint && npx tsc --noEmit && npm run e2e && npm run check:secrets`
Expected: tudo PASS.

- [ ] **Step 5: Commit**
```bash
git add -A web docs
git commit -m ":sparkles: feat: Pedidos na área do cliente e no admin (status, nota, histórico, reenvio de e-mails) e documentação"
```
