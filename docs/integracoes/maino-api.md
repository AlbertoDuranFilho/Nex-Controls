# Mainô API — notas para a integração (pedido → NF-e)

Fonte: https://changelog.maino.com.br/api-reference-maino (GitBook; índice em `/api-reference-maino/sitemap-pages.xml`).
Lido em 2026-11-26. Trechos marcados (?) foram lidos só por resumo e precisam ser confirmados.

## Geral
- Base única: `https://api.maino.com.br/api/v2`. Não há sandbox de API.
- Ambiente fiscal (Produção/Homologação) é escolhido só na UI: app.maino.com.br/configuracoes → Fiscal → Ambiente. Padrão: Produção. Homologação muda apenas a transmissão à SEFAZ.
- Limite: 5 req/s por credencial; 429 com `Retry-After`.
- Erros: 401 `{"error"}`; 422 `{"errors": {campo: [msgs]}}`; 404 em texto.

## Autenticação (01)
- `POST /authentication` `{application_uid, email, password}` → `access_token`, `refresh_token`, `cnpj`, `company_name`.
- Header: `Authorization: Bearer <access_token>`. Token não expira por tempo; deixa de valer quando renovado/revogado.
- Renovação: `POST https://api.maino.com.br/oauth/token` (?) — formato não confirmado.
- Chave: Configurações → Integrações → API Mainô (link de aprovação vale 7 dias).

## Clientes (03) — `POST /stakeholders` (find-or-create por CPF/CNPJ)
- `tipos: ["cliente"]`, `razao_social`, `cnpj`|`cpf`, `inscricao_estadual`, `indicador_ie` (1 contribuinte, 2 isento, 9 não contribuinte), `cep`, `endereco`, `numero`, `complemento`, `bairro`, `municipio` (IBGE ou nome), `uf`, `email`, `ddd`, `telefone`.
- Com CEP a Mainô resolve o município. Mapear nosso enum `indicador_ie` → 1/2/9.

## Condições de pagamento (07)
- `GET /condicoes_pagamento?page=N` → `id`, `descricao`, `ativo`, `forma_pagamento`, `quantidade_parcelas`…
- No pedido usar `cobranca.condicao_pagamento_id`.

## Pedidos de venda (06)
- `POST /pedidos?transmite=0|1&async=0|1&url=<callback>` — `url` obrigatório se `async=1` ou `transmite=1`.
- Body: `numero` (único), `cliente` {…, `somente_busca`}, `itens[]` {`codigo`, `descricao`, `pu`, `quantidade`, `valor_desconto` | `percentual_desconto`}, `cobranca` {`forma_pagamento`, `plano_de_conta`, `condicao_pagamento_id`, `parcelas[]`}, `modalidade_frete`, `valor_frete`, `observacao`, `informacoes_complementares`.
- Resposta de sucesso do POST: não documentada (?).
- `GET/PUT/DELETE /pedidos/{id}`; `PUT /pedidos/{id}/update_status?status=`.
- Emitir NF-e: `POST /pedidos/{pedido_id}/nota_fiscal` (valida estoque, impostos, certificado; pedido vira "finalizado").
- Consultar: `GET /pedidos/{pedido_id}/nota_fiscal` → `{id, chave_acesso, status, danfe_url}`; status `NAO_TRANSMITIDA|EM_TRANSMISSAO|ACEITA|REJEITADA|CANCELADA|DENEGADA`.
- Cancelar: `DELETE /pedidos/{pedido_id}/nota_fiscal` → 204.

## Notas fiscais (18)
- `GET /nfes/{id}` (status, `chave_acesso_nfe`, `protocolo`, `pedido_id`); `GET /notas_fiscais_emitidas` (com `xml`); `GET /nfes_emitidas` → `zip_url`, `zip_url_danfe`.
- Webhook: existe evento `nota_fiscal.autorizada` com `pedido_id` (?), payload não documentado → consultar status periodicamente como garantia.

## Produtos (14, 20)
- Não há API de cadastro de produto de estoque com NCM/CEST/origem. Produtos são cadastrados no app da Mainô; o pedido os referencia por `codigo` (mesmo código do site).
- `GET /fiscal/ncms` só consulta a tabela de NCM.

## Perguntas em aberto para a Mainô
1. Body/resposta de sucesso de `POST /pedidos` e `POST /pedidos/{id}/nota_fiscal`.
2. Payload e autenticação do callback `url` / evento `nota_fiscal.autorizada`.
3. Importar produtos em lote (planilha) com NCM, CEST, origem, GTIN.
4. Fluxo de renovação do token.
