# Nex Controls — site (web/)

Next.js 15 (App Router), next-intl (pt/en/es), Tailwind 4 e Supabase (Postgres + Auth).
O banco, as migrations e os testes de RLS ficam em `supabase/` na raiz do monorepo.
A visão geral das decisões está em [`docs/architecture.md`](../docs/architecture.md).

## Pré-requisitos

- Node.js e npm.
- Docker Desktop (o Supabase local roda em containers). No Windows, mantenha a
  imagem de disco do Docker em um drive com espaço livre.

## Rodando localmente

Na **raiz do repositório**:

```bash
npm install
npm run db:start    # sobe o Supabase local (Postgres, Auth, Mailpit)
npm run db:reset    # recria o banco aplicando supabase/migrations
npm run db:test     # testes pgTAP de RLS
npm run db:types    # regenera web/types/database.ts
npm run db:stop
```

Em **web/**:

```bash
cp .env.example .env.local   # preencha as chaves exibidas por `npm run db:start`
npm install
npm run dev
npm test                     # Vitest
npm run lint
npm run e2e                  # Playwright: faz build, sobe em :3000 e usa o Mailpit em :54324
```

Os testes e2e precisam do Supabase local no ar. Não deixe outro processo na porta 3000.

## Variáveis de ambiente

Veja `web/.env.example`.

| Variável | Observação |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor**, nunca com prefixo `NEXT_PUBLIC_` |
| `FEATURE_TROCA_SENHA` | `false` por padrão |
| `NEXT_PUBLIC_SITE_URL` | origem do site, sem caminho (ex.: `https://www.nexcontrols.com`) |

`NEXT_PUBLIC_SITE_URL` é **obrigatória em produção e no momento do build**.
Sem ela, a troca de e-mail é recusada em produção (o link de confirmação não
pode depender do host da requisição).

## Fases 2–4: catálogo, carrinho e pedido manual

O site vende em fluxo **manual** (sem pagamento online): o cliente logado monta o
carrinho e gera o pedido; a Nex combina frete e pagamento fora do site.

### Variáveis novas

| Variável | Observação |
| --- | --- |
| `RESEND_API_KEY` | e-mails de pedido. Sem a chave e fora de produção, o envio é só simulado no console (`[email simulado] ...`) |
| `EMAIL_REMETENTE` | padrão `Nex Controls <contato@nexcontrols.com>` |
| `EMAIL_PEDIDOS_DESTINO` | caixa da Nex que recebe o pedido; padrão `contato@nexcontrols.com` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | upload de imagens (até 5 MB, pasta `nex/produtos`) e manuais em PDF (até 20 MB, pasta `nex/manuais`); **somente servidor** |
| `FEATURE_PAGAMENTO_ONLINE` | `false`: pagamento online (Stone) desligado |
| `FEATURE_NFE_AUTOMATICA` | `false`: emissão automática de NF (Mainô) desligada |
| `REVALIDATE_SECRET` | gancho de teste de `POST /api/revalidar`. **Deixe vazio em produção** |

### Importar produtos por planilha

1. Baixe o modelo em `web/public/modelos/modelo-produtos.xlsx` (também servido em `/modelos/modelo-produtos.xlsx`).
2. Preencha e envie em `/pt/admin/produtos/importar` (arquivo `.xlsx` de até 4 MB: a Vercel
   limita o corpo da requisição a 4,5 MB).
3. A tela mostra uma prévia com os valores normalizados (NCM, EAN e código vindos do Excel
   como número, preço `189,90`) e as pendências (por exemplo, imagem ou manual sem arquivo).
   Só depois de confirmar a importação os produtos são gravados.
4. Reimportação (mesmo código): os campos da aba Produtos são substituídos. Sem a aba
   Especificacoes, as especificações atuais ficam; sem a aba Imagens, ou com só arquivos
   pendentes para o código, as imagens atuais ficam; manual vazio ou pendente mantém o atual.
   Preço vazio remove o preço: a prévia avisa "preço atual será removido".

### Fluxo manual de pedido

1. O cliente gera o pedido em `/pt/cliente/carrinho` (cupom opcional; vale o maior entre o
   desconto do cliente e o do cupom). O pedido nasce `aguardando_pagamento`.
2. O cliente e a Nex recebem e-mails (só em português). Se o envio falhar, o pedido existe
   mesmo assim; o admin vê "E-mails pendentes" e usa **Reenviar e-mails**.
3. A Nex cobra o cliente e emite a nota fiscal manualmente.
4. No admin (`/pt/admin/pedidos`), a Nex muda o status e cola o link da nota (`https://`).
   O cliente vê o status e o link em `/pt/cliente/pedidos`.

Transições permitidas (impostas pelo banco, em `admin_atualizar_pedido`; a lista da tela fica
em `web/lib/pedidos/transicoes.ts`): `aguardando_pagamento` para `pago` ou `cancelado`;
`pago` para `faturado` ou `cancelado`; `faturado` para `enviado`; `enviado` para `entregue`;
`entregue` para `devolvido`. Cada mudança grava um evento no histórico.

### Pendência legal (antes de `FEATURE_PAGAMENTO_ONLINE=true`)

Publicar o **endereço físico** da empresa (Decreto 7.962/2013) no rodapé e na política. Isso
é obrigatório antes de ligar o pagamento online. Vendas a pessoa física também têm o direito
de arrependimento de 7 dias (CDC, art. 49): o pedido guarda o tipo de pessoa para isso.

## NF-e automática (Mainô)

Com este recurso ligado, a nota fiscal é emitida pela Mainô a partir do painel do pedido,
sem copiar e colar o link. Com ele desligado, o fluxo manual acima continua igual.

### Antes de ligar

1. **Produtos na Mainô.** Cada produto do site precisa existir na Mainô com o **mesmo
   código** usado no site, e com NCM e demais dados fiscais preenchidos. Sem isso a Mainô
   recusa o pedido.
2. **Condição de pagamento.** Na Mainô, tenha uma condição de pagamento ativa. O número
   (id) dela é consultado em `GET /condicoes_pagamento` na API; se não souber fazer isso,
   peça ao suporte da Mainô ou ao desenvolvedor. Esse id vai em `MAINO_CONDICAO_PAGAMENTO_ID`.
   Opcionalmente, `MAINO_FORMA_PAGAMENTO`, `MAINO_PLANO_DE_CONTA` e `MAINO_MODALIDADE_FRETE`
   (padrão `9`, sem frete). Todas estão em `web/.env.example`.
3. **Teste em Homologação.** Na Mainô, vá em Configurações → Fiscal → Ambiente e escolha
   **Homologação**: as notas deixam de valer na SEFAZ. Atenção: essa escolha vale para a
   **conta toda**, não só para o site. Volte para **Produção** quando terminar os testes.

### Onde colocar as credenciais

Somente na Vercel (Settings → Environment Variables), em **Production e Preview**. Nunca no
repositório, em e-mail ou em chat.

- `MAINO_APPLICATION_UID`: é emitido pela Mainô para cada aplicação. Solicite em
  Configurações → Integrações → API Mainô (o link de aprovação vale 7 dias) ou pelo suporte
  da Mainô.
- `MAINO_EMAIL` e `MAINO_SENHA`: crie na Mainô um **usuário só para a integração** (não use
  o login de uma pessoa), para poder trocar a senha sem afetar ninguém.

### Como ligar

Defina `FEATURE_NFE_AUTOMATICA=true` na Vercel e faça um novo deploy (redeploy). Em produção,
o build falha se faltar alguma das três credenciais.

### Passo a passo no painel

1. Abra o pedido em `/pt/admin/pedidos` quando ele estiver **Pago**.
2. Clique em **Enviar para a Mainô**. O pedido fica em digitação lá.
3. Confira o pedido na Mainô (frete, itens, impostos) e ajuste o que precisar.
4. Volte ao painel e clique em **Emitir NF-e**.
5. Clique em **Atualizar situação** (também atualiza sozinho ao abrir o pedido enquanto a
   nota está em transmissão, no máximo a cada 30 segundos). O botão continua aparecendo se a
   nota foi autorizada mas o link do DANFE ainda não chegou; quando ele chegar, o cliente
   recebe o e-mail.
6. Quando a nota for **Autorizada**, o pedido passa para **Faturado** e o cliente recebe um
   e-mail com o link do DANFE.

**Cancelar NF-e** (nota autorizada) cancela só a nota; o pedido não é cancelado
automaticamente. Decida separadamente se cancela o pedido. Na área do cliente, o pedido passa
a mostrar "Nota fiscal cancelada" em vez do link.

**Cupom de desconto.** O desconto do cupom vai para a Mainô repartido entre os itens
(desconto por unidade), para que a nota feche com o que o cliente pagou. Em pedidos sem
nenhum item de quantidade 1 pode haver diferença de alguns centavos; confira o total.

### Se der erro

A mensagem da Mainô aparece no próprio painel do pedido (por exemplo, produto sem cadastro
na Mainô, ou dado fiscal faltando). Corrija na Mainô ou nos dados do pedido e tente de novo.
Se a mensagem não for clara, envie-a ao suporte; ela não contém senhas.

- **"O pedido foi criado na Mainô como SITE-… (id …), mas não foi possível registrar isso no
  site".** O pedido existe na Mainô, mas o site não guardou o vínculo (falha no banco, mesmo
  após uma nova tentativa). **Não clique em Enviar de novo**: isso tentaria criar outro
  pedido. Peça ao desenvolvedor/suporte para gravar o id mostrado no pedido
  (`pedidos.maino_pedido_id`); o id também fica no log do servidor
  (`[nfe] pedido criado na Mainô sem gravar o id`).
- **Emissão sem resposta da Mainô (tempo esgotado).** A Mainô pode ter recebido o pedido de
  emissão; o painel mostra **Atualizar situação** em vez de **Emitir NF-e**. Se a Mainô
  disser que não há nota, emita pela própria Mainô e depois atualize a situação.

### Ainda pendente com a Mainô

> **Atenção:** os formatos das respostas da API (criação do pedido, emissão e consulta da
> nota) ainda não foram confirmados pela Mainô. O site aceita as variações conhecidas, mas
> faça o **primeiro pedido real em Homologação** e compare, linha a linha, os itens, o
> desconto (inclusive o do cupom), o frete e o total da nota com o total do pedido no site
> antes de voltar para Produção.

## App Android (Fase 8)

O app (`mobile/`) fala direto com o Supabase (login e RPCs) e usa uma única rota do site:

- `POST /api/app/pedidos/[id]/notificar` com `Authorization: Bearer <access_token>`: envia os e-mails
  do pedido recém-criado. `401` sem token ou token inválido, `404` se o pedido não existe ou não é do
  lojista do token, `200 {"jaNotificado":true}` se já foi enviado (idempotente) e `200 {"enviado":boolean}`
  caso contrário (`false` quando o envio falhou: a reserva é desfeita e o admin pode reenviar). `500` se a
  leitura/reserva do pedido no banco falhar e `502 {"erro":"falha_ao_notificar"}` se o envio dos e-mails
  lançar erro (a reserva também é desfeita). Sem CORS (app nativo).
- O app chama a rota em `EXPO_PUBLIC_SITE_URL`, que deve ser o host que responde direto, sem redirect
  (`https://www.nexcontrols.com`; `https://nexcontrols.com` redireciona para o `www` e o redirect descarta
  o `Authorization`).
- Exclusão de conta (Google Play): página pública `/[locale]/excluir-conta` (link no rodapé e na política de
  privacidade). URL para o formulário da Play: `https://www.nexcontrols.com/pt/excluir-conta`.

## Configuração do Supabase

A configuração local é `supabase/config.jsonc` (formato da CLI v3, não `config.toml`).
Ajustes importantes:

- `enable_signup: false` — clientes são criados apenas pelo admin.
- `double_confirm_changes: true` — troca de e-mail confirmada nos dois endereços.
- `enable_confirmations: true` — necessário para a troca de e-mail segura; **não mude para `false`**.
- Template do e-mail de troca de endereço: `supabase/templates/email_change.html`.

## Configurando staging e produção

1. Crie dois projetos Supabase (staging e produção) na região `sa-east-1`, no plano gratuito.
2. Em **Auth → SMTP**, configure SMTP próprio (Resend), com remetente no domínio da Nex.
3. Em **Auth → Email Templates**, cole o conteúdo de `supabase/templates/email_change.html`
   no template "Change Email Address".
4. Em **Auth → URL Configuration**, defina o Site URL e, em Redirect URLs, as entradas exatas
   (sem curingas amplos):
   ```
   https://<site>/pt/auth/confirm
   https://<site>/en/auth/confirm
   https://<site>/es/auth/confirm
   ```
5. Aplique as migrations:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Se a migration falhar na criação do agendamento, habilite a extensão `pg_cron`
   (Database → Extensions) e rode de novo.
6. Defina as variáveis de ambiente na Vercel (inclusive `NEXT_PUBLIC_SITE_URL` antes do build).
7. Configure o Auth no painel (ver abaixo). **Faça nos dois projetos.**

### Auth nos projetos hospedados (obrigatório, nos DOIS projetos)

`supabase/config.jsonc` vale **só para o Supabase local**: `supabase db push` não leva
essas opções. Um projeto hospedado novo nasce com **cadastro aberto** (qualquer pessoa
criaria conta pela API pública com a chave anon). Em staging **e** em produção:

1. **Authentication → Sign In / Providers**:
   - desligue **Allow new users to sign up** (clientes só são criados pelo admin);
   - provider **Email** habilitado;
   - **Confirm email** ligado;
   - **Secure email change** ligado (troca de e-mail confirmada nos dois endereços).
2. **JWT expiry** (*Access token expiry time*, em Project Settings → JWT Keys) = `3600`
   segundos. É o prazo em que um JWT já emitido segue válido depois de um ban; não aumente.
3. **Minimum password length**: no mínimo `12` (as senhas provisórias geradas pelo admin
   têm 12+ caracteres). Em **Password requirements**, exigir letras e números é recomendado.
4. **Rate limits**: ver "Limites de requisição do Auth" abaixo.
5. Confira depois: `curl -s https://<ref>.supabase.co/auth/v1/settings` deve mostrar
   `"disable_signup":true` e `"mailer_autoconfirm":false`.

Alternativa: `npx supabase config push --project-ref <ref>` envia as opções de
`supabase/config.jsonc` para o projeto hospedado. **Atenção:** o arquivo foi escrito para
o ambiente local (ex.: `minimum_password_length` 6, `site_url` de localhost, SMTP do
Mailpit, limites de e-mail baixos). Revise o diff que o comando mostra antes de confirmar
e, depois, confira cada item acima no painel.

### Troca de senha pelo cliente (`FEATURE_TROCA_SENHA`)

Antes de ligar `FEATURE_TROCA_SENHA=true`, habilite **Secure password change**
(`secure_password_change`, reautenticação por código enviado ao e-mail) em
Authentication → Sign In / Providers → Email, nos dois projetos. Sem isso, quem tiver
uma sessão aberta (ex.: computador compartilhado) troca a senha sem saber a atual.

### Limites de requisição do Auth (rate limits)

O GoTrue limita login (`sign_in_sign_ups`) e renovação de sessão (`token_refresh`)
**por IP**. Como o login e o refresh são feitos no servidor (Server Actions e middleware
na Vercel), as requisições saem de IPs da Vercel: **todos os clientes dividem o mesmo
limite**. Antes de abrir as vendas:

- aumente os valores em **Authentication → Rate Limits** (nos dois projetos);
- considere um limite por cliente na própria aplicação (ex.: por e-mail/IP real do
  `x-forwarded-for`) para conter força bruta sem depender só do limite global.

O plano gratuito pausa o projeto após 7 dias sem atividade. Um workflow
agendado no GitHub Actions fará uma consulta periódica para evitar a pausa.

## CI e automações (GitHub Actions)

Workflows em `.github/workflows/`:

| Arquivo | Quando roda | O que faz |
|---|---|---|
| `ci.yml` | PR e push em `main` | Sobe o Supabase local, pgTAP, Vitest, Playwright e `check:secrets` |
| `deploy-db.yml` | push em `main` com mudanças em `supabase/**` | `supabase db push` em staging e, após aprovação, em produção |
| `keepalive.yml` | a cada 3 dias (`0 12 */3 * *`) e manual | Consulta leve nos dois projetos para evitar a pausa do plano gratuito |
| `backup.yml` | domingos 06:00 UTC e manual | Dump da produção (schema e dados), criptografado com gpg, artefato por 90 dias |

### Configuração (uma vez)

1. Crie os projetos de staging e produção (ver seção anterior).
2. Em **Settings → Secrets and variables → Actions**, cadastre os secrets:
   `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`,
   `PROD_PROJECT_REF`, `PROD_DB_PASSWORD`, `STAGING_URL`, `STAGING_ANON_KEY`,
   `PROD_URL`, `PROD_ANON_KEY`, `PROD_DB_URL` (string de conexão do Postgres de
   produção, de preferência o pooler) e `BACKUP_PASSPHRASE` (senha longa; guarde
   também em um gerenciador de senhas: sem ela os backups não abrem).
3. Em **Settings → Environments**, crie o environment `production` e marque
   **Required reviewers**. É isso que exige aprovação manual antes de aplicar
   migrations em produção.
4. Recomendado: ative branch protection em `main` exigindo o check `ci` antes do merge,
   pois o `deploy-db` roda no push em `main` sem esperar o `ci`.
5. Abra um PR de teste e confirme o `ci` verde. Depois rode `keepalive` e
   `backup` manualmente (**Actions → Run workflow**).

### Restaurar um backup

Baixe o artefato `backup-producao` (arquivos `.sql.gpg`) e, em uma máquina segura:

```bash
gpg --decrypt dump-AAAAMMDD.sql.gpg > dump.sql          # pede a BACKUP_PASSPHRASE
gpg --decrypt dump-auth-AAAAMMDD.sql.gpg > dump-auth.sql
gpg --decrypt dump-data-AAAAMMDD.sql.gpg > dump-data.sql
# Ordem: schema, depois dados de auth (auth.users), depois dados de public
psql "$DB_URL_DESTINO" -f dump.sql
psql "$DB_URL_DESTINO" -f dump-auth.sql
psql "$DB_URL_DESTINO" -f dump-data.sql
```

O dump padrão não inclui `auth.users`; por isso há um arquivo separado `dump-auth`
(`profiles` e `lojistas` dependem dele). Em um projeto Supabase novo, o schema `auth`
já existe; se houver conflito de linhas, restaure em um banco vazio.

Apague os `.sql` em claro depois: contêm dados pessoais (LGPD).

## Primeiro admin

1. No painel do Supabase (Auth → Users), crie o usuário (e-mail e senha).
2. No SQL Editor, marque-o como admin:
   ```sql
   update profiles set is_admin = true, nome = '...' where id = '...';
   update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"nome":"...","papel":"admin"}'
    where id = '...';
   ```
3. Entre em `/pt/cliente/login`; o admin é redirecionado para `/pt/admin/lojistas`.

## Antes de publicar em produção

Preencha os placeholders `TODO_*` (busque por `TODO_CNPJ` e `TODO_ENDERECO`):

- rodapé: `footer.cnpj` e `footer.address` em `web/messages/{pt,en,es}.json`;
- confirme também a política de privacidade (`/privacy-policy`) com os dados da empresa.

### Guard de build

`npm run build` roda antes o `prebuild` (`web/scripts/verificar-producao.mjs`). Quando
`VERCEL_ENV=production` (build de produção na Vercel), ele **falha o build** (exit 1) se:

- alguma string de `web/messages/{pt,en,es}.json` contiver `TODO_`; ou
- faltar `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`; ou
- `FEATURE_NFE_AUTOMATICA=true` e faltar `MAINO_APPLICATION_UID`, `MAINO_EMAIL` ou `MAINO_SENHA`.

A mensagem lista o arquivo/chave ou o nome da variável (nunca o valor). Em preview, dev,
CI e e2e (`VERCEL_ENV` diferente de `production`) ele não faz nada. As regras ficam em
`web/lib/build/verificar-producao.mjs` (testadas pelo Vitest).

## Conformidade

A política de privacidade (`privacy`, seção "Cadastro e compras") e o rodapé cobrem
LGPD, Marco Civil (art. 15) e Decreto 7.962/2013. Pedidos de exclusão chegam por
`contato@nexcontrols.com` e são atendidos pela ação admin "anonimizar".
