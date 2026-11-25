# Fase 1 — Supabase + Auth + Área do Cliente: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação Supabase (schema completo + RLS), login real do cliente, área do cliente (dados + endereço + troca de e-mail) e painel admin de clientes no `web/`.

**Architecture:** Toda regra de acesso vive em RLS/funções SQL em `supabase/migrations` (raiz do monorepo, compartilhado com o futuro app). O Next.js usa `@supabase/ssr` com três clients (browser, server, admin/service-role só no servidor). Login e ações de admin são Server Actions; páginas públicas continuam estáticas.

**Tech Stack:** Supabase (Postgres 15, Auth, pg_cron, pgTAP), Supabase CLI + Docker, Next.js 15.5 (App Router), next-intl 4, Tailwind 4, `@supabase/ssr`, `@supabase/supabase-js`, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-supabase-foundation-auth-design.md` — leia antes de qualquer task; o schema SQL e a tabela de RLS de lá são a fonte de verdade.

## Global Constraints

- Região dos projetos Supabase: `sa-east-1`. Plano gratuito (staging e produção).
- `SUPABASE_SERVICE_ROLE_KEY` nunca com prefixo `NEXT_PUBLIC_`; `web/lib/supabase/admin.ts` começa com `import "server-only"`.
- `supabase/config.toml`: `[auth] enable_signup = false` (ninguém se cadastra sozinho), `[auth.email] double_confirm_changes = true` (troca de e-mail confirma nos dois endereços).
- Todas as tabelas de `public` com RLS habilitada; nenhuma tabela sem policy explícita.
- Documento (CPF/CNPJ) é sempre armazenado só com dígitos: CPF 11, CNPJ 14.
- Flag `FEATURE_TROCA_SENHA` padrão `false`; com `false`, nenhum link/tela de senha aparece ao cliente.
- Login: mensagem única de erro "E-mail ou senha inválidos." (pt) e equivalentes en/es.
- Telas de cliente em pt/en/es (`messages/*.json`); telas `/admin` só pt (texto direto, sem next-intl).
- Páginas públicas (home, catálogo, privacidade) continuam estáticas: o layout raiz não lê cookies; o menu do usuário no cabeçalho é ilha client que lê a sessão localmente (`auth.getSession()`, sem rede).
- Nome e papel exibidos no cabeçalho vêm de `app_metadata` (`{ nome: string, papel: "admin" | "lojista" }`), gravado só pela service role. Autorização NUNCA usa `app_metadata` — só RLS/`profiles.is_admin`.
- Dados da empresa: razão social "Nex Controls do Brasil LTDA", UF PE, contato de privacidade `contato@nexcontrols.com`; CNPJ e endereço = placeholder `TODO_CNPJ` / `TODO_ENDERECO`.
- Metas de desempenho p75 mobile: LCP < 2,5 s, INP < 200 ms, CLS < 0,1.
- Commits seguem o padrão do repo: `:sparkles: feat: ...`, `:white_check_mark: test: ...`, `:memo: docs: ...`, `:construction_worker: ci: ...`.

## Review Focus

1. **CPF/CNPJ digitado com pontuação ou espaços** (`123.456.789-09`, ` 12.345.678/0001-95 `) → normalizado antes de validar e gravar; duplicado mostra "Já existe um cliente com este CPF/CNPJ." em vez de erro cru do Postgres. Testes: Task 3 (unit) e Task 6 (e2e duplicado).
2. **E-mail já existente no Auth ao criar cliente / falha no insert de `lojistas`** → erro amigável e nenhum órfão (nem usuário Auth sem linha em `lojistas`, nem o contrário). Teste: Task 6.
3. **Parâmetro `next` do login apontando para fora** (`//evil.com`, `https://evil.com`, `/\evil.com`) → ignorado, cai no destino padrão. Teste: Task 3 (unit de `destinoSeguro`).
4. **Redirecionamentos preservam o idioma**: `/en/cliente` sem sessão → `/en/cliente/login?next=/en/cliente`; admin em `/es/cliente` → `/es/admin/lojistas`. Teste: Task 5 (e2e).
5. **ViaCEP fora do ar, lento ou CEP inexistente** → formulário de endereço continua utilizável, campos ficam editáveis, aviso discreto. Testes: Task 3 (unit com fetch falhando/timeout) e Task 7 (e2e com rota ViaCEP bloqueada).

---

## File Structure

```
package.json                         (NOVO, raiz) scripts db:* + devDep supabase
supabase/
  config.toml
  migrations/
    20261125000001_identidade.sql    enums, profiles, lojistas, acessos_log, funções, triggers, RLS, grants
    20261125000002_catalogo_compra.sql  produtos…pedido_itens, seed PE, RLS, pg_cron
  tests/
    _helpers.psql                    funções de teste (incluídas via \ir; extensão != .sql → não roda sozinho)
    identidade.test.sql
    catalogo_compra.test.sql
web/
  vitest.config.ts, playwright.config.ts
  lib/validacao/documento.ts, cep.ts, telefone.ts   (+ *.test.ts ao lado)
  lib/senha.ts (+ test), lib/redirect.ts (+ test), lib/flags.ts
  lib/supabase/client.ts, server.ts, admin.ts, middleware.ts
  types/database.ts                  (gerado)
  services/auth.ts, lojistas-admin.ts, minha-conta.ts   ("use server")
  components/MenuUsuario.tsx, components/conta/*.tsx, components/admin/*.tsx
  src/middleware.ts                  (MODIFICAR)
  src/app/[locale]/cliente/login/page.tsx   (REESCREVER)
  src/app/[locale]/cliente/(area)/layout.tsx, page.tsx, endereco/page.tsx
  src/app/[locale]/auth/confirm/route.ts
  src/app/[locale]/admin/layout.tsx, lojistas/page.tsx, lojistas/novo/page.tsx, lojistas/[id]/page.tsx
  e2e/global-setup.ts, e2e/*.spec.ts
  scripts/check-secrets.mjs
.github/workflows/ci.yml, deploy-db.yml, keepalive.yml, backup.yml
docs/architecture.md
```

---

### Task 1: Supabase local + schema de identidade + RLS

**Files:**
- Create: `package.json` (raiz), `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261125000001_identidade.sql`, `supabase/tests/_helpers.psql`, `supabase/tests/identidade.test.sql`

**Interfaces:**
- Produces (SQL): enums `tipo_pessoa`, `indicador_ie`; tabelas `profiles`, `lojistas`, `acessos_log` exatamente como na spec (incluindo `profiles.nome`, `lojistas.id … on delete restrict`, `documento` nullable com o `check` de anonimização); funções `public.is_admin() returns boolean`, `public.is_lojista_ativo() returns boolean` (`security definer`, `stable`, `set search_path = public`); trigger `on_auth_user_created` (insere `profiles`), trigger `on_auth_user_email_changed` (copia `new.email` para `lojistas.email`), trigger genérico `set_updated_at()`.
- Produces (test helpers): `tests.criar_usuario(email text) returns uuid`, `tests.autenticar_como(uid uuid)` (seta `role authenticated` + `request.jwt.claims`), `tests.anonimo()`. O `_helpers.psql` também cria o cenário padrão (admin `a`, lojistas `l1`, `l2`, `l3` desativado) e exporta os ids como variáveis psql com `\gset`, por isso os testes usam `:'l1'` etc.
- Produces (scripts raiz): `npm run db:start`, `db:stop`, `db:reset`, `db:test`, `db:types` (= `supabase gen types typescript --local > web/types/database.ts`).

- [ ] **Step 1:** Na raiz, `npm init -y`, `npm i -D supabase`, `npx supabase init`. Em `config.toml`: `project_id = "nexcontrols"`, `[auth] enable_signup = false`, `site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**"]`, `[auth.email] double_confirm_changes = true`, `enable_confirmations = false`. Adicione os scripts `db:*` acima. Run `npm run db:start` → Expected: imprime `API URL: http://127.0.0.1:54321`.

- [ ] **Step 2: Escreva os testes pgTAP que falham** em `supabase/tests/identidade.test.sql` (começa com `begin; \ir _helpers.psql`, termina com `select * from finish(); rollback;`). Cenário: admin A (profiles.is_admin=true), lojista L1 e L2 ativos, lojista L3 `ativo=false`.
```sql
select has_table('public','lojistas');
select tests.anonimo();
select is_empty($$select * from lojistas$$, 'anon não lê lojistas');
select tests.autenticar_como(:'l1');
select results_eq($$select id from lojistas$$, array[:'l1'::uuid], 'L1 só vê a si');
select is_empty($$update lojistas set telefone='1' where id=:'l2' returning id$$, 'L1 não altera L2');
select throws_ok($$update lojistas set desconto_percentual=50 where id=:'l1'$$, '42501', null, 'L1 não altera desconto');
select throws_ok($$update lojistas set documento='00000000000' where id=:'l1'$$, '42501');
select lives_ok($$update lojistas set telefone='81999999999', cep='50000000' where id=:'l1'$$, 'L1 edita colunas permitidas');
select throws_ok($$insert into lojistas(id,tipo_pessoa,documento,nome,email) values (gen_random_uuid(),'PF','11111111111','x','x@x')$$, '42501');
select is_empty($$select * from acessos_log$$, 'lojista não lê acessos_log');
select ok(public.is_lojista_ativo(), 'L1 ativo');
select tests.autenticar_como(:'l3');
select ok(not public.is_lojista_ativo(), 'L3 desativado');
select tests.autenticar_como(:'a');
select results_eq($$select count(*)::int from lojistas$$, array[3], 'admin vê todos');
-- checks
select throws_ok($$insert into lojistas(id,tipo_pessoa,documento,nome,email) values (tests.criar_usuario('z@z'),'PF','123','x','z@z')$$, '23514', null, 'CPF com tamanho errado');
-- trigger e-mail
select lives_ok($$update auth.users set email='novo@l1.com' where id=:'l1'$$);
select is((select email from lojistas where id=:'l1'), 'novo@l1.com');
```
Run `npm run db:test` → Expected: FAIL (`relation "lojistas" does not exist`).

- [ ] **Step 3:** Escreva a migration `20261125000001_identidade.sql`. Policies conforme a tabela de RLS da spec. Grants de coluna:
```sql
revoke insert, update, delete on public.lojistas from anon, authenticated;
grant update (nome_fantasia, inscricao_estadual, indicador_ie, responsavel_nome, telefone, whatsapp,
  cep, logradouro, numero, complemento, bairro, cidade, uf) on public.lojistas to authenticated;
revoke all on public.acessos_log from anon, authenticated;
```
Admin faz updates de qualquer coluna pela service role (Server Actions), não por `authenticated`; a policy de admin em `lojistas` é só `select`.

- [ ] **Step 4:** `npm run db:reset && npm run db:test` → Expected: todos os testes `ok`, `Result: PASS`.

- [ ] **Step 5: Commit** `:sparkles: feat: Supabase local e schema de identidade com RLS`

---

### Task 2: Schema de catálogo e compra + RLS + pg_cron

**Files:**
- Create: `supabase/migrations/20261125000002_catalogo_compra.sql`, `supabase/tests/catalogo_compra.test.sql`

**Interfaces:**
- Consumes: `is_admin()`, `is_lojista_ativo()`, `set_updated_at()` (Task 1).
- Produces: tabelas `produtos`, `produto_imagens`, `produto_especificacoes`, `produto_precos`, `lojista_descontos_produto`, `cupons`, `aliquotas_icms_uf`, `carrinho_itens`, `pedidos`, `pedido_itens` e enums `cupom_tipo`, `pedido_status`, `desconto_origem` exatamente como na spec. Seed: `insert into aliquotas_icms_uf values ('PE', 20.50, null)`. Job pg_cron `limpa_acessos_log` diário às 03:00 UTC: `delete from acessos_log where created_at < now() - interval '6 months'`.

- [ ] **Step 1: Testes que falham** em `catalogo_compra.test.sql` (produto P ativo com preço 100, produto Q inativo; lojistas L1 ativo, L2 ativo, L3 desativado; cupom C):
```sql
select tests.anonimo();
select results_eq($$select count(*)::int from produtos$$, array[1], 'anon vê só ativos');
select is_empty($$select * from produto_precos$$, 'anon não vê preço');
select tests.autenticar_como(:'l1');
select results_eq($$select preco from produto_precos$$, array[100.00::numeric], 'lojista ativo vê preço');
select is_empty($$select * from cupons$$, 'lojista não lista cupons');
select is_empty($$select * from lojista_descontos_produto where lojista_id=:'l2'$$, 'não vê desconto de outro');
select lives_ok($$insert into carrinho_itens(lojista_id,produto_id,quantidade) values (:'l1',:'p',2)$$);
select throws_ok($$insert into carrinho_itens(lojista_id,produto_id,quantidade) values (:'l2',:'p',1)$$, '42501');
select throws_ok($$insert into pedidos(lojista_id, cliente_tipo_pessoa, cliente_documento, cliente_nome, cliente_indicador_ie, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf, subtotal, total) values (:'l1','PF','1','x','nao_contribuinte','1','x','1','x','x','PE',1,1)$$, '42501', null, 'pedido só via função (fase 4)');
select throws_ok($$insert into produtos(nome,codigo) values ('x','x')$$, '42501', null, 'lojista não cria produto');
select tests.autenticar_como(:'l3');
select is_empty($$select * from produto_precos$$, 'desativado não vê preço');
select tests.autenticar_como(:'a');
select lives_ok($$insert into produtos(nome,codigo) values ('Novo','N1')$$, 'admin cria produto');
select is((select aliquota_interna from aliquotas_icms_uf where uf='PE'), 20.50::numeric);
select isnt_empty($$select 1 from cron.job where jobname='limpa_acessos_log'$$);
```
Run `npm run db:test` → Expected: FAIL.

- [ ] **Step 2:** Escreva a migration. `create extension if not exists pg_cron with schema pg_catalog` (em produção, se o comando falhar, habilitar pg_cron em Database → Extensions no painel e rodar de novo). `pedidos`/`pedido_itens`: só policies de `select` (próprios ou admin), sem `insert` para `authenticated`. Admin escreve no catálogo via policies `for all using (is_admin()) with check (is_admin())`.

- [ ] **Step 3:** `npm run db:reset && npm run db:test` → Expected: PASS em ambos os arquivos. Em seguida `npm run db:types` → Expected: `web/types/database.ts` criado contendo `lojistas` e `produto_precos`.

- [ ] **Step 4: Commit** `:sparkles: feat: Schema de catálogo, preços, cupons e pedidos com RLS`

---

### Task 3: Ferramentas de teste + bibliotecas puras de validação

**Files:**
- Modify: `web/package.json` (devDeps `vitest`, `@vitest/coverage-v8`; script `"test": "vitest run"`)
- Create: `web/vitest.config.ts` (alias `@` → raiz de `web/`, environment `node`, include `lib/**/*.test.ts`)
- Create: `web/lib/validacao/documento.ts`, `cep.ts`, `telefone.ts`, `web/lib/senha.ts`, `web/lib/redirect.ts`, `web/lib/flags.ts` e um `*.test.ts` ao lado de cada (exceto flags)

**Interfaces:**
- Produces:
  - `somenteDigitos(valor: string): string`
  - `validarDocumento(tipo: "PF" | "PJ", valor: string): { ok: true; documento: string } | { ok: false; erro: "formato" | "digito" }`
  - `formatarDocumento(documento: string): string` (`12345678909` → `123.456.789-09`; 14 dígitos → `12.345.678/0001-95`)
  - `type EnderecoCep = { logradouro: string; bairro: string; cidade: string; uf: string }`
  - `normalizarCep(valor: string): string | null` (8 dígitos ou null)
  - `buscarCep(cep: string, fetchFn?: typeof fetch, timeoutMs = 3000): Promise<EnderecoCep | null>` — ViaCEP `https://viacep.com.br/ws/{cep}/json/`; retorna `null` em erro de rede, timeout, HTTP != 200 ou `{erro: true}`; nunca lança.
  - `validarTelefone(valor: string): string | null` (10 ou 11 dígitos, DDD 11–99)
  - `gerarSenhaProvisoria(): string` — 12 caracteres via `crypto.getRandomValues`, alfabeto sem ambíguos (`0O1lI`), garante ≥1 maiúscula, minúscula, dígito.
  - `destinoSeguro(next: string | null | undefined, locale: string): string` — aceita só caminhos que começam com `/${locale}/` e não contêm `//`, `\`, nem esquema; senão retorna `/${locale}/cliente`.
  - `flags.trocaSenha: boolean` (`process.env.FEATURE_TROCA_SENHA === "true"`)

- [ ] **Step 1: Testes que falham** (`describe`/`it` do Vitest):
```ts
// documento.test.ts
expect(validarDocumento("PF", "529.982.247-25")).toEqual({ ok: true, documento: "52998224725" });
expect(validarDocumento("PF", " 52998224725 ")).toEqual({ ok: true, documento: "52998224725" });
expect(validarDocumento("PF", "529.982.247-24")).toEqual({ ok: false, erro: "digito" });
expect(validarDocumento("PF", "111.111.111-11")).toEqual({ ok: false, erro: "digito" });
expect(validarDocumento("PJ", "11.222.333/0001-81")).toEqual({ ok: true, documento: "11222333000181" });
expect(validarDocumento("PJ", "52998224725")).toEqual({ ok: false, erro: "formato" });
expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
// cep.test.ts
expect(normalizarCep("50.030-230")).toBe("50030230");
expect(normalizarCep("1234")).toBeNull();
await expect(buscarCep("50030230", async () => { throw new Error("offline"); })).resolves.toBeNull();
await expect(buscarCep("50030230", () => new Promise(() => {}), 50)).resolves.toBeNull();
await expect(buscarCep("99999999", async () => new Response('{"erro":true}'))).resolves.toBeNull();
await expect(buscarCep("50030230", async () => new Response('{"logradouro":"Rua A","bairro":"B","localidade":"Recife","uf":"PE"}')))
  .resolves.toEqual({ logradouro: "Rua A", bairro: "B", cidade: "Recife", uf: "PE" });
// telefone.test.ts
expect(validarTelefone("(81) 99999-0000")).toBe("81999990000");
expect(validarTelefone("0899990000")).toBeNull();
// senha.test.ts — 200 iterações
expect(s).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#$%*]{12}$/); expect(s).toMatch(/[A-Z]/); expect(s).toMatch(/[a-z]/); expect(s).toMatch(/\d/);
// redirect.test.ts
expect(destinoSeguro("/pt/cliente/endereco", "pt")).toBe("/pt/cliente/endereco");
for (const mal of ["//evil.com", "https://evil.com", "/\\evil.com", "/pt//evil.com", "/en/cliente", null, ""])
  expect(destinoSeguro(mal, "pt")).toBe("/pt/cliente");
```
Run `cd web && npm test` → Expected: FAIL (módulos inexistentes).

- [ ] **Step 2:** Implemente os módulos com as assinaturas acima. CPF/CNPJ pelo algoritmo padrão de dígitos verificadores, rejeitando sequências repetidas.

- [ ] **Step 3:** `npm test` → Expected: PASS.

- [ ] **Step 4: Commit** `:white_check_mark: test: Vitest e validações de CPF/CNPJ, CEP, telefone, senha e redirect`

---

### Task 4: Clients Supabase + middleware encadeado

**Files:**
- Modify: `web/package.json` (deps `@supabase/ssr`, `@supabase/supabase-js`, `server-only`)
- Create: `web/lib/supabase/client.ts`, `server.ts`, `admin.ts`, `middleware.ts`; `web/.env.example`
- Modify: `web/src/middleware.ts`, `web/.gitignore` (garantir `.env*.local`)
- Test: `web/e2e/` vem na Task 5; aqui verificação por build.

**Interfaces:**
- Consumes: `Database` de `web/types/database.ts` (Task 2).
- Produces:
  - `createClient(): SupabaseClient<Database>` (browser, `client.ts`)
  - `createClient(): Promise<SupabaseClient<Database>>` (server, `server.ts`, cookies de `next/headers`)
  - `createAdminClient(): SupabaseClient<Database>` (`admin.ts`, `import "server-only"`, `auth: { persistSession: false }`)
  - `updateSession(request: NextRequest, response: NextResponse): Promise<{ response: NextResponse; user: User | null; papel: "admin" | "lojista" | null }>` (`lib/supabase/middleware.ts`; papel lido de `user.app_metadata.papel` só para decidir redirect)
  - Regras do `src/middleware.ts` (ordem: next-intl → `updateSession` → proteção):
    - `/{l}/cliente/*` exceto `/{l}/cliente/login`, sem user → `/{l}/cliente/login?next=<caminho>`
    - `/{l}/admin/*` sem user → `/{l}/cliente/login`; user com papel ≠ admin → `/{l}/cliente`
    - `/{l}/cliente/login` com user → admin `/{l}/admin/lojistas`, lojista `/{l}/cliente`
  - `.env.example`: as 3 variáveis da spec + `FEATURE_TROCA_SENHA=false`.

- [ ] **Step 1:** Instale deps, crie os clients seguindo o padrão oficial `@supabase/ssr` para Next.js App Router (`getAll`/`setAll` de cookies). Matcher do middleware inalterado.
- [ ] **Step 2:** Preencha `web/.env.local` com as chaves do `npm run db:start` (anon e service_role locais). Run `cd web && npm run build` → Expected: build OK, e a rota `/[locale]` e `/[locale]/catalogo/[id]` continuam marcadas `●`/`○` (estáticas/SSG) na saída do build — se virarem `ƒ`, o layout está lendo cookies e precisa corrigir.
- [ ] **Step 3: Commit** `:sparkles: feat: Clients Supabase e middleware com refresh de sessão e proteção de rotas`

---

### Task 5: Login, logout e menu do usuário (+ Playwright)

**Files:**
- Modify: `web/package.json` (devDep `@playwright/test`; scripts `"e2e": "playwright test"`)
- Create: `web/playwright.config.ts` (webServer `npm run build && npm run start`, baseURL `http://localhost:3000`, globalSetup), `web/e2e/global-setup.ts`, `web/e2e/fixtures.ts`, `web/e2e/login.spec.ts`
- Create: `web/services/auth.ts`, `web/components/MenuUsuario.tsx`
- Rewrite: `web/src/app/[locale]/cliente/login/page.tsx`
- Modify: `web/components/Navbar.tsx` (inserir `<MenuUsuario />` no desktop e no menu mobile), `web/messages/{pt,en,es}.json` (chaves `login.*` e `menuUsuario.*`)

**Interfaces:**
- Consumes: clients (Task 4), `destinoSeguro` (Task 3).
- Produces:
  - `entrar(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin>` com `type EstadoLogin = { erro: string | null }` — campos `email`, `senha`, `next`, `locale`; `signInWithPassword` no server client; em sucesso grava `acessos_log` (`user_id`, `ip` de `x-forwarded-for` primeiro valor ou `x-real-ip`, `user_agent`) via admin client, depois `redirect()` (admin → `/{l}/admin/lojistas`; senão `destinoSeguro(next, l)`). Em falha, `{ erro: t("login.erroCredenciais") }`.
  - `sair(locale: string): Promise<never>` → `signOut` + `redirect(/{l})`.
  - `getUsuarioAtual(): Promise<{ id: string; email: string; papel: "admin" | "lojista"; nome: string } | null>` (server; usado pelos layouts protegidos).
  - `e2e/fixtures.ts`: `criarAdmin(): Promise<{email; senha}>`, `criarLojista(dados?: Partial<...>): Promise<{id; email; senha}>` (padrão: PJ, nome "Loja Teste", ativo, e-mail único por teste) usando service role local (cria usuário Auth com `app_metadata`, linha em `lojistas`/`profiles`), `limparUsuarios()`.
- Login page: Server Component com formulário client (`useActionState`), rótulos visíveis, `autocomplete="email"`/`"current-password"`, botão mostrar/ocultar senha, botão desabilitado durante envio. Remove "Esqueceu sua senha? Recuperar" (sem fluxo nesta fase). `MenuUsuario`: visitante → link "Entrar"; logado → "Olá, {nome}" com "Minha conta" (ou "Admin") e "Sair".

- [ ] **Step 1: Testes e2e que falham** (`login.spec.ts`):
```ts
test("lojista entra e vê saudação", ...)       // login → url /pt/cliente; header contém "Olá, Loja Teste"
test("senha errada mostra erro genérico", ...) // texto "E-mail ou senha inválidos."; url continua /pt/cliente/login
test("lojista desativado consegue entrar", ...) // url /pt/cliente
test("rota protegida preserva idioma e destino", ...) // goto /en/cliente/endereco → url /en/cliente/login?next=%2Fen%2Fcliente%2Fendereco; após login → /en/cliente/endereco
test("next externo é ignorado", ...)           // /pt/cliente/login?next=//evil.com → após login url /pt/cliente
test("lojista não acessa admin", ...)          // goto /pt/admin/lojistas → /pt/cliente
test("admin vai para o painel; admin em /es/cliente vai para /es/admin/lojistas", ...)
test("sair encerra a sessão", ...)             // clicar Sair → /pt; goto /pt/cliente → login
test("login grava acessos_log", ...)           // fixture consulta acessos_log via service role: 1 linha com user_id
```
Run `cd web && npx playwright install chromium && npm run e2e` → Expected: FAIL.
- [ ] **Step 2:** Implemente `services/auth.ts`, a página, `MenuUsuario` e as traduções (pt/en/es).
- [ ] **Step 3:** `npm run e2e -- login.spec.ts` → Expected: 9 passed.
- [ ] **Step 4: Commit** `:sparkles: feat: Login real, logout, registro de acessos e menu do usuário`

---

### Task 6: Painel admin de clientes

**Files:**
- Create: `web/services/lojistas-admin.ts`, `web/src/app/[locale]/admin/layout.tsx`, `admin/lojistas/page.tsx`, `admin/lojistas/novo/page.tsx`, `admin/lojistas/[id]/page.tsx`, `web/components/admin/FormLojista.tsx`, `web/components/admin/SenhaGerada.tsx`, `web/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `getUsuarioAtual` (Tasks 4–5), `validarDocumento`, `formatarDocumento`, `gerarSenhaProvisoria` (Task 3).
- Produces (todas `"use server"`, todas começam verificando `getUsuarioAtual()?.papel === "admin"` **e** `profiles.is_admin` no banco; senão lançam):
  - `type ResultadoAdmin<T = void> = { ok: true; dados: T } | { ok: false; erro: string }`
  - `listarLojistas(busca?: string): Promise<LojistaResumo[]>` — busca por nome, nome_fantasia ou documento (dígitos), ordenado por nome, `LojistaResumo = { id; nome; documento: string | null; email; ativo; anonimizado: boolean }`
  - `criarLojista(form: FormData): Promise<ResultadoAdmin<{ id: string; senha: string }>>` — campos `tipo_pessoa`, `documento`, `nome`, `email`, `desconto_percentual`. Ordem: validar → checar documento duplicado (erro "Já existe um cliente com este CPF/CNPJ.") → `auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { nome, papel: "lojista" } })` (e-mail existente → "Já existe um usuário com este e-mail.") → insert `lojistas`; se o insert falhar, `auth.admin.deleteUser(id)` e retorna erro.
  - `atualizarLojista(id: string, form: FormData): Promise<ResultadoAdmin>` — admin edita qualquer campo da spec; se `nome` mudar, atualiza também `app_metadata.nome`.
  - `definirAtivo(id: string, ativo: boolean): Promise<ResultadoAdmin>`
  - `gerarNovaSenha(id: string): Promise<ResultadoAdmin<{ senha: string }>>`
  - `anonimizarLojista(id: string): Promise<ResultadoAdmin>` — `updateUserById(id, { email: \`anonimizado-${id}@invalid\`, ban_duration: "876000h", app_metadata: { nome: "Cliente anonimizado", papel: "lojista" } })`, depois update `lojistas` conforme spec (documento null, nome "Cliente anonimizado", contatos/endereço/IE null, ativo false, anonimizado_em now()).
- UI: `/admin/layout.tsx` redireciona se não for admin (checagem no servidor). Lista em tabela com busca; `SenhaGerada` mostra a senha uma vez com botão "Copiar" e aviso "Esta senha não será exibida novamente". Anonimizar exige confirmação digitando o documento.

- [ ] **Step 1: Testes e2e que falham** (`admin.spec.ts`, logado como admin):
```ts
test("cria cliente PJ com documento formatado e senha aparece uma vez", ...) // documento "11.222.333/0001-81" → lista mostra "11.222.333/0001-81"; senha visível; recarregar → senha some
test("cliente criado consegue logar com a senha provisória", ...)
test("documento duplicado mostra erro amigável", ...) // "Já existe um cliente com este CPF/CNPJ."
test("e-mail duplicado não deixa órfão", ...)         // erro "Já existe um usuário com este e-mail."; fixture: count lojistas e auth.users inalterados
test("CPF inválido é recusado", ...)                   // "529.982.247-24" → mensagem de dígito inválido
test("desativar: cliente entra mas admin vê inativo", ...)
test("gerar nova senha: senha antiga falha, nova funciona", ...)
test("anonimizar: login falha, CPF fica livre para novo cadastro", ...)
```
Run `npm run e2e -- admin.spec.ts` → Expected: FAIL.
- [ ] **Step 2:** Implemente serviços e telas.
- [ ] **Step 3:** `npm run e2e -- admin.spec.ts` → Expected: 8 passed.
- [ ] **Step 4: Commit** `:sparkles: feat: Painel admin de clientes (criar, editar, desativar, nova senha, anonimizar)`

---

### Task 7: Área do cliente (dados, endereço, e-mail, senha oculta)

**Files:**
- Create: `web/services/minha-conta.ts`, `web/src/app/[locale]/cliente/(area)/layout.tsx`, `(area)/page.tsx`, `(area)/endereco/page.tsx`, `(area)/seguranca/page.tsx`, `web/src/app/[locale]/auth/confirm/route.ts`, `web/components/conta/NavConta.tsx`, `FormMeusDados.tsx`, `FormEndereco.tsx`, `FormEmail.tsx`, `FormSenha.tsx`, `web/e2e/conta.spec.ts`
- Modify: `web/messages/{pt,en,es}.json` (namespace `conta.*`)

**Interfaces:**
- Consumes: server client, `getUsuarioAtual`, `flags.trocaSenha`, `buscarCep`, `normalizarCep`, `validarTelefone`.
- Produces (`"use server"`, sempre com o server client do usuário — RLS e grants de coluna fazem a barreira):
  - `obterMeuCadastro(): Promise<MeuCadastro>` (linha de `lojistas` + `email` + `emailPendente: string | null` de `user.new_email`)
  - `salvarMeusDados(_prev: EstadoForm, form: FormData): Promise<EstadoForm>` — `nome_fantasia`, `responsavel_nome`, `telefone`, `whatsapp`, `inscricao_estadual`, `indicador_ie`; `type EstadoForm = { status: "idle" | "ok" | "erro"; mensagem?: string; erros?: Record<string, string> }`
  - `salvarEndereco(_prev: EstadoForm, form: FormData): Promise<EstadoForm>` — todos obrigatórios exceto complemento; `uf` em 27 siglas válidas.
  - `alterarEmail(_prev: EstadoForm, form: FormData): Promise<EstadoForm>` — `updateUser({ email }, { emailRedirectTo: \`${origin}/${locale}/auth/confirm\` })`.
  - `alterarSenha(_prev: EstadoForm, form: FormData): Promise<EstadoForm>` — retorna erro se `!flags.trocaSenha`; mínimo 8 caracteres, confirmação igual.
  - `GET /[locale]/auth/confirm?token_hash&type=email_change` → `verifyOtp`; sucesso → `/{l}/cliente?email=confirmado`, falha → `/{l}/cliente?email=erro`.
- Layout `(area)`: exige lojista (admin → `/{l}/admin/lojistas`); `NavConta` lateral no desktop / abas no mobile com "Meus dados" e "Endereço"; "Segurança" só se `flags.trocaSenha`. A página `seguranca` dá `notFound()` com a flag desligada.
- `FormEndereco` (client): ao completar 8 dígitos do CEP chama `buscarCep` e preenche logradouro/bairro/cidade/uf, foca em "Número"; se `null`, mostra "Não encontramos o CEP, preencha manualmente." e mantém tudo editável.
- Template de e-mail "Change Email Address" (`supabase/templates/email_change.html`, pt) com link `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email_change`; registrar em `config.toml` `[auth.email.template.email_change]`.

- [ ] **Step 1: Testes e2e que falham** (`conta.spec.ts`, logado como lojista):
```ts
test("documento e nome aparecem só leitura", ...)       // inputs disabled / texto, valor formatado
test("salva dados e mostra Salvo", ...)                 // telefone "(81) 99999-0000" → recarregar mantém "81999990000" formatado
test("CEP preenche endereço", ...)                      // page.route ViaCEP → JSON Recife; campos preenchidos; salvar → persistido
test("ViaCEP fora do ar não bloqueia", ...)             // page.route ViaCEP → abort; aviso aparece; preencher manual e salvar ok
test("troca de e-mail pede confirmação nos dois", ...)  // enviar → "aguardando confirmação"; Mailpit (http://127.0.0.1:54324/api/v1/messages) recebe 2 e-mails; abrir os dois links → e-mail novo aparece em Meus dados; login com e-mail novo funciona
test("senha oculta com flag desligada", ...)            // sem link "Segurança"; goto /pt/cliente/seguranca → 404
test("tela em inglês", ...)                             // /en/cliente mostra "My details"
```
Run `npm run e2e -- conta.spec.ts` → Expected: FAIL.
- [ ] **Step 2:** Implemente serviços, rota de confirmação, telas e traduções. Rode `npm run db:reset` após alterar `config.toml`.
- [ ] **Step 3:** `npm run e2e -- conta.spec.ts` → Expected: 7 passed. Rode também com `FEATURE_TROCA_SENHA=true npm run build` e confirme manualmente que "Segurança" aparece e troca a senha.
- [ ] **Step 4: Commit** `:sparkles: feat: Área do cliente com dados, endereço via CEP e troca de e-mail`

---

### Task 8: Conformidade legal e documentação

**Files:**
- Modify: `web/components/Footer.tsx` (razão social, `CNPJ: TODO_CNPJ`, `TODO_ENDERECO`, e-mail de contato), `web/messages/{pt,en,es}.json` (seção da política de privacidade), página `web/src/app/[locale]/privacy-policy/page.tsx` se a estrutura exigir novas seções
- Modify: `web/README.md`; Create: `docs/architecture.md`, `web/e2e/legal.spec.ts`

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Teste e2e que falha** (`legal.spec.ts`): rodapé de `/pt` contém "Nex Controls do Brasil LTDA" e "contato@nexcontrols.com"; `/pt/privacy-policy`, `/en/privacy-policy`, `/es/privacy-policy` contêm cada uma uma seção sobre cadastro/compras e o e-mail `contato@nexcontrols.com`. Run → FAIL.
- [ ] **Step 2:** Atualize o rodapé e a política nas 3 línguas cobrindo: dados coletados no cadastro (lista da spec), finalidade (venda, entrega, nota fiscal), base legal (execução de contrato e obrigação legal), retenção (dados fiscais 5 anos; registros de acesso 6 meses), direitos do titular e como exercê-los (`contato@nexcontrols.com`), anonimização, hospedagem no Brasil. Mantenha o tom e a estrutura atuais da página.
- [ ] **Step 3:** README: criar projetos Supabase (`sa-east-1`), variáveis, `npm run db:start/test/types`, `npm test`, `npm run e2e`, SMTP Resend no painel (Auth → SMTP), templates, primeiro admin (criar usuário no painel + `update profiles set is_admin = true, nome = '...' where id = '...';` + `app_metadata` `{"nome": "...", "papel": "admin"}` via SQL `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"nome":"...","papel":"admin"}' where id = '...';`), placeholders `TODO_*` a preencher antes de produção. `docs/architecture.md`: abordagem A, onde fica cada regra, como o `mobile/` consome as mesmas tabelas/RLS e que login no app deve passar por Edge Function para manter `acessos_log`.
- [ ] **Step 4:** `npm run e2e -- legal.spec.ts` → PASS.
- [ ] **Step 5: Commit** `:memo: docs: Política de privacidade, rodapé legal, README e arquitetura`

---

### Task 9: CI, deploy de migrations, keep-alive e backup

**Files:**
- Create: `web/scripts/check-secrets.mjs`, `.github/workflows/ci.yml`, `deploy-db.yml`, `keepalive.yml`, `backup.yml`
- Modify: `web/package.json` (script `"check:secrets": "node scripts/check-secrets.mjs"`)

**Interfaces:**
- `check-secrets.mjs`: lê `process.env.SUPABASE_SERVICE_ROLE_KEY`; varre recursivamente `.next/static` e `.next/server/app/**/*.html`; sai com código 1 e imprime o arquivo se encontrar a chave; sai 1 se a variável estiver vazia.
- Secrets do GitHub: `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PROD_PROJECT_REF`, `PROD_DB_PASSWORD`, `STAGING_URL`, `STAGING_ANON_KEY`, `PROD_URL`, `PROD_ANON_KEY`, `PROD_DB_URL`, `BACKUP_PASSPHRASE`.

- [ ] **Step 1:** Escreva `check-secrets.mjs`. Verifique: `cd web && npm run build && npm run check:secrets` → Expected: exit 0. Depois crie `.next/static/vazamento.js` contendo o valor da chave e rode de novo → Expected: exit 1 apontando `vazamento.js`. Apague o arquivo.
- [ ] **Step 2:** `ci.yml` (on: pull_request, push main): job único Ubuntu — checkout, Node 20, `npm ci` na raiz e em `web/`, `npx supabase start`, `npx supabase test db`, exportar chaves de `npx supabase status -o env` para `web/.env.local`, `npm test`, `npx playwright install --with-deps chromium`, `npm run e2e`, `npm run check:secrets`. Upload do relatório Playwright em falha.
- [ ] **Step 3:** `deploy-db.yml` (on: push main com mudanças em `supabase/**`): `supabase link --project-ref $STAGING_PROJECT_REF` + `supabase db push`; depois job dependente, com `environment: production` (aprovação manual no GitHub), faz o mesmo para produção.
- [ ] **Step 4:** `keepalive.yml` (cron `0 12 */3 * *` + workflow_dispatch): `curl -fsS "$URL/rest/v1/produtos?select=id&limit=1" -H "apikey: $ANON_KEY"` para staging e produção.
- [ ] **Step 5:** `backup.yml` (cron `0 6 * * 0` + workflow_dispatch): `supabase db dump --db-url "$PROD_DB_URL" -f dump.sql` (e `--data-only` em segundo arquivo), `gpg --batch --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE"` em cada um, `rm` dos `.sql` em claro, `actions/upload-artifact` com `retention-days: 90`, somente arquivos `.gpg`.
- [ ] **Step 6:** Abra um PR de teste → Expected: workflow `ci` verde. Rode `keepalive` e `backup` por `workflow_dispatch` depois que os projetos remotos existirem (passo manual do usuário: criar os 2 projetos no painel e cadastrar os secrets — documentado no README na Task 8).
- [ ] **Step 7: Commit** `:construction_worker: ci: Testes, deploy de migrations, keep-alive e backup criptografado`
