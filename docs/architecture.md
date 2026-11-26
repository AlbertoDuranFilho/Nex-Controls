# Arquitetura

## Decisão: Supabase-only (abordagem A)

O backend é o próprio Supabase (Postgres + Auth). Não há API intermediária própria.

- **Regras de negócio e de acesso vivem no Postgres**: RLS em todas as tabelas e
  funções SQL (`security definer` quando necessário).
- **Integrações externas** (Stone, Mainô, e-mail transacional) vivem em **Edge Functions**
  (`supabase/functions/`, a partir das fases 4–5).
- Middleware e layouts do Next.js apenas melhoram a experiência (redirecionar);
  **a barreira de segurança é a RLS**.

## Estrutura

```
supabase/                  compartilhado por web e mobile
  config.jsonc             configuração da CLI v3 (não config.toml)
  migrations/              schema, RLS, funções, triggers, pg_cron
  templates/               e-mails do Auth (email_change.html)
  tests/                   testes pgTAP de RLS
  functions/               Edge Functions (fases 4–5)
web/                       site Next.js (ver web/README.md)
  lib/supabase/            client.ts (browser, anon), server.ts (cookies), admin.ts (service role, server-only)
  services/                auth.ts, lojistas-admin.ts, minha-conta.ts, carrinho.ts, pedidos.ts, pedidos-cliente.ts, pedidos-admin.ts
mobile/                    app (consome o mesmo projeto Supabase)
```

## Onde fica cada regra

| Regra | Onde |
| --- | --- |
| Quem lê/edita o quê (cliente vê só seus dados, admin vê tudo) | RLS (`profiles`, `lojistas`, pedidos...) |
| Criar/anonimizar cliente, desativar, nova senha | Server Actions do admin com service role (`web/lib/supabase/admin.ts`) |
| Registro de acessos (`acessos_log`) | Escrita só por service role; leitura só admin |
| Retenção de `acessos_log` (6 meses, Marco Civil art. 15) | `pg_cron` (migration) |
| Confirmação de troca de e-mail | Supabase Auth (`double_confirm_changes`, `enable_confirmations`) |
| Preço do cliente, simulação do carrinho, cupom e criação do pedido | Funções SQL `precos_cliente`, `simular_pedido`, `criar_pedido` (security definer; o preço nunca vem do navegador) |
| Mudança de status e link da nota | Função `admin_atualizar_pedido` (só `is_admin()`; valida a transição e grava `pedido_eventos`) |
| E-mails do pedido (cliente e Nex) | `notificarPedido` (`web/services/pedidos.ts`, só servidor) + `marcar_pedido_notificado` (só `service_role`) |
| Pagamento (Stone) e NF/ERP (Mainô) | Edge Functions futuras em `supabase/functions/` (`stone-*`, `maino-*`), atrás de `FEATURE_PAGAMENTO_ONLINE` e `FEATURE_NFE_AUTOMATICA`. Hoje o fluxo é manual (`gateway_provider = 'manual'`) |

Chaves: `anon` no browser e no app; `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor
(nunca `NEXT_PUBLIC_`), nunca no app mobile.

## Como o mobile consome

O `mobile/` fala direto com o mesmo projeto Supabase, usando a chave anon e a sessão
do usuário: as mesmas tabelas e as mesmas políticas de RLS do site. Nenhuma regra é
duplicada no cliente.

**Login no app deve passar por uma Edge Function** (que autentica e grava em
`acessos_log` com service role). O cliente não tem permissão de escrita em
`acessos_log`; sem a Edge Function o registro de acessos do app não seria confiável.

## Restrições para as fases 4 e 5

- Escritas do admin em `pedidos` e `pedido_itens` somente via service role ou funções
  `security definer`. **Nunca** conceder `UPDATE` em `pedidos` a `authenticated` sem
  uma policy com `is_admin()`.
- O checkout deve **revalidar** `produtos.ativo` e o endereço do lojista no momento da compra.
- A validação de cupom passa por uma **função**, nunca por leitura direta da tabela `cupons`.
- Admin lê `pedidos`, `pedido_eventos` e `profiles` com a service role depois de `exigirAdmin()`:
  `pedido_eventos` não concede `admin_id` a `authenticated`. O cliente lê com o client do usuário (RLS), sempre com colunas explícitas.
- Pedidos guardam snapshots fiscais do cliente; a anonimização não os altera
  (guarda de 5 anos, LGPD art. 16, I).

## Ambientes

- **Local**: Supabase CLI em Docker (`npm run db:start`).
- **Staging**: projeto Supabase separado (`sa-east-1`, plano gratuito), usado pelos previews da Vercel.
  Previews nunca apontam para produção.
- **Produção**: projeto Supabase próprio, usado só pelo deploy de `main`.
- O plano gratuito pausa após 7 dias sem atividade; um workflow agendado no GitHub
  Actions fará uma consulta periódica para evitar a pausa.

Passo a passo de configuração (SMTP Resend, redirect URLs, primeiro admin) em
[`web/README.md`](../web/README.md).

## Conformidade

LGPD (minimização, base legal de contrato e obrigação legal, acesso/correção na área
do cliente, exclusão por anonimização), Marco Civil art. 15 e Decreto 7.962/2013
(identificação da empresa no rodapé). Antes de produção, preencher `TODO_CNPJ` e
`TODO_ENDERECO`.
