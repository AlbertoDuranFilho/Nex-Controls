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
