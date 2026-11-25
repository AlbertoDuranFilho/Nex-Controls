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

O dump padr�o n�o inclui `auth.users`; por isso h� um arquivo separado `dump-auth`
(`profiles` e `lojistas` dependem dele). Em um projeto Supabase novo, o schema `auth`
j� existe; se houver conflito de linhas, restaure em um banco vazio.

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

## Conformidade

A política de privacidade (`privacy`, seção "Cadastro e compras") e o rodapé cobrem
LGPD, Marco Civil (art. 15) e Decreto 7.962/2013. Pedidos de exclusão chegam por
`contato@nexcontrols.com` e são atendidos pela ação admin "anonimizar".
