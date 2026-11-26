# Fase 5a — NF-e automática pela Mainô (design)

Status: decidido pelo Claude com autorização do usuário ("pode seguir com as etapas de
implementação") enquanto ele estava fora. Cada escolha não confirmada está em **Calls**.

## Intenção
Hoje o pedido é manual: a Nex recebe o e-mail, emite a NF na Mainô e cola o link no
painel. Objetivo: o admin emite a NF-e da Mainô a partir do painel do pedido, o site
acompanha a autorização, guarda chave e DANFE, muda o pedido para **Faturado** e avisa o
cliente por e-mail com o link do DANFE. O fluxo manual continua existindo (flag desligada).

## Não-objetivos
- Pagamento (Stone) — fase 5b.
- Cadastro de produtos na Mainô pela API (a API não tem; produtos são cadastrados no app
  da Mainô com o **mesmo código** do site).
- Cálculo de frete/impostos no site (a Mainô calcula impostos; frete segue "a combinar").
- Webhook da Mainô (payload não documentado) — status é consultado sob demanda.

## Fluxo (admin, pedido com status `pago`, `FEATURE_NFE_AUTOMATICA=true`)
1. **Enviar para a Mainô** → `POST /pedidos?transmite=0` com cliente inline, itens por
   `codigo`, cobrança da condição configurada. Grava `maino_pedido_id`.
   O pedido fica em digitação na Mainô: o admin pode conferir/ajustar lá (frete, etc.).
2. **Emitir NF-e** → `POST /pedidos/{maino_pedido_id}/nota_fiscal`. Grava `nfe_status`.
3. **Atualizar situação** (botão, e automático ao abrir o pedido no painel quando o status
   está `NAO_TRANSMITIDA`/`EM_TRANSMISSAO`) → `GET /pedidos/{id}/nota_fiscal`.
   Grava status, `chave_acesso` (em `maino_nota_id`) e `danfe_url` (em `maino_nota_url`).
   Ao virar `ACEITA` com o pedido em `pago`: pedido → `faturado` (evento com admin_id
   nulo = sistema) e e-mail ao cliente com o link do DANFE.
4. **Cancelar NF-e** (status `ACEITA`) → `DELETE /pedidos/{id}/nota_fiscal` → `CANCELADA`.
   O status do pedido não muda sozinho (admin decide: cancelar pedido etc.).
Erros da Mainô (422 `errors`, 400, 404) aparecem no painel (`nfe_erro`) sem dados sensíveis.

## Dados
- `pedidos`: `maino_pedido_id text`, `nfe_status text` (check: NAO_TRANSMITIDA,
  EM_TRANSMISSAO, ACEITA, REJEITADA, CANCELADA, DENEGADA), `nfe_erro text`,
  `nfe_atualizado_em timestamptz`.
- `integracao_tokens (provedor text pk, access_token text, atualizado_em)`: só service role.
- Função `sistema_registrar_nfe(...)` (service_role) aplica o resultado de forma atômica,
  incluindo a transição `pago → faturado` e o evento.

## Cliente Mainô (server-only, Next.js)
- Base `MAINO_API_URL` (padrão `https://api.maino.com.br/api/v2`).
- Login `POST /authentication {application_uid, email, password}`; token guardado em
  `integracao_tokens`; em 401 refaz o login uma vez. Header `Authorization: Bearer`.
- 429: espera `Retry-After` (máx. 5 s) e tenta uma vez.
- Timeout 15 s por chamada.
- Município: código IBGE pelo CEP (ViaCEP `https://viacep.com.br/ws/{cep}/json/`); se
  falhar, envia sem `municipio` (a Mainô resolve pelo CEP).

## Mapeamento do pedido
- `numero`: `"SITE-<numero>"`. `observacao`: observação do pedido.
- `cliente`: `cnpj` ou `cpf` (pelo tipo de pessoa), `razao_social`, `indicador_ie`
  (contribuinte→1, isento→2, não contribuinte→9), `inscricao_estadual`, `cep`, `uf`,
  `endereco`, `numero`, `complemento`, `bairro`, `municipio` (IBGE), `email`,
  `ddd`/`telefone` (do telefone do lojista, só dígitos), `somente_busca: false`.
- `itens[]`: `codigo`, `descricao`, `pu` = `preco_unitario` (já com desconto), `quantidade`.
- `modalidade_frete`: `MAINO_MODALIDADE_FRETE` (padrão `9`), `valor_frete`: frete do pedido.
- `cobranca` só se `MAINO_CONDICAO_PAGAMENTO_ID` estiver definido:
  `{forma_pagamento: MAINO_FORMA_PAGAMENTO, plano_de_conta: MAINO_PLANO_DE_CONTA,
  condicao_pagamento_id}`.

## Configuração
Vercel (Production e Preview), nunca no repositório: `FEATURE_NFE_AUTOMATICA`,
`MAINO_APPLICATION_UID`, `MAINO_EMAIL`, `MAINO_SENHA`, opcionais `MAINO_API_URL`,
`MAINO_CONDICAO_PAGAMENTO_ID`, `MAINO_FORMA_PAGAMENTO`, `MAINO_PLANO_DE_CONTA`,
`MAINO_MODALIDADE_FRETE`. Build guard: em produção com a flag ligada exige as três
credenciais.

## Approaches
- **A (escolhida): Server Actions no Next.js**, como Resend e Cloudinary já são; testável
  com Vitest e e2e (servidor Mainô falso). Custo: credenciais ficam na Vercel, não nos
  segredos do Supabase como dito antes ao usuário.
- B: Edge Functions do Supabase (Deno). Segredos no Supabase, mas outro runtime, sem
  testes no CI atual (edge-runtime desligado) e duplicaria acesso a dados/e-mail.
- C: automático no "Pago" (sem botões). Rejeitado por ora: sem sandbox de API, o admin
  precisa de um ponto de conferência antes de transmitir.

## Calls (decididos sem o usuário; custo se errado)
1. Server Actions em vez de Edge Functions — mover depois custa reescrever o cliente HTTP.
2. Dois passos (enviar / emitir) — se quiserem um clique só, é juntar dois botões.
3. `indicador_ie` 1/2/9 (padrão NF-e e página de clientes; a página de pedidos fala em
   3) — uma constante.
4. Modalidade de frete padrão 9 (sem frete) — variável de ambiente.
5. Sem webhook; consulta ao abrir o pedido + botão — se a Mainô documentar o callback,
   adiciona-se uma rota.
6. Cancelar NF-e não cancela o pedido.
