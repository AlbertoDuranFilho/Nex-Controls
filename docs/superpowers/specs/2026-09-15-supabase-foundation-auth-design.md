# Fase 1 — Fundação Supabase + Autenticação + Área do Cliente

Status: aprovado (rev. 2, 2026-11-25)
Repositório: monorepo `NexControls` (`web/`, `backend/`, `mobile/`)

## Intenção

A NexControls vai transformar o site institucional (`web/`, Next.js 15) em um
e-commerce B2B: clientes cadastrados pela própria Nex veem preços, recebem
descontos próprios ou por cupom, compram pagando via **Stone** (PIX, boleto,
cartão) e recebem nota fiscal emitida automaticamente pela **Mainô** — sem
intervenção manual. O mesmo backend vai servir o app (`mobile/`, Expo) mais
tarde.

Hoje o catálogo e o formulário de contato vêm do Strapi (`backend/`, Render).
**Decisão tomada:** descontinuar Strapi e Render; todo o backend passa a ser
**Supabase** (Postgres + Auth + Edge Functions). Imagens e manuais continuam
no **Cloudinary** — o banco guarda só a URL.

Esta fase é a fundação: projeto Supabase, **schema completo** do domínio
(inclusive tabelas que só as fases seguintes vão consumir, para não exigir
migração retroativa), regras de acesso (RLS), login do cliente, área do
cliente e um painel admin mínimo para a Nex cadastrar clientes.

### Roteiro geral (5 fases)

1. **Fundação Supabase + Auth + Área do Cliente** ← este documento
2. Catálogo: produtos no Supabase, migração do Strapi, vitrine pública sem
   preço, preço/desconto só para logados, admin de produtos/cupons; desligar
   Strapi/Render ao final
3. Carrinho (persistido por cliente)
4. Checkout: resumo do pedido, frete, regra de desconto/cupom, pagamento via
   adapter (mock), nota fiscal Mainô, e-mails, histórico de pedidos
5. Integração real com a Stone no adapter da fase 4

Cada fase entrega os testes do que ela própria constrói.

## Regras de negócio decididas

### Cliente (tabela `lojistas`)

- Pode ser **pessoa jurídica (CNPJ) ou pessoa física (CPF)**. Documento é
  **único por cadastro**.
- **A Nex cadastra:** tipo de pessoa, CPF/CNPJ, nome/razão social, e-mail e
  senha provisória (gerada pelo sistema). Opcionalmente o desconto do cliente.
- **O cliente completa/edita na área do cliente:** endereço (um único),
  telefone, WhatsApp, nome do responsável, nome fantasia, inscrição estadual
  (ou marcar "isento"/"não contribuinte").
- **O cliente pode trocar o e-mail**, com confirmação por link enviado ao
  novo endereço (comportamento padrão do Supabase Auth).
- **Troca de senha:** implementada, mas **oculta** atrás de uma feature flag
  desligada. Enquanto oculta, quem esquecer a senha fala com a Nex, e o admin
  usa **"gerar nova senha provisória"**.
- CPF/CNPJ, tipo de pessoa, nome/razão social e desconto **não** são
  editáveis pelo cliente (só admin).
- **Um único endereço** por cliente. É usado para nota fiscal, entrega e,
  quando o pagamento for cartão, como endereço de cobrança enviado ao
  antifraude (sem campo extra para o cliente). Endereço é opcional no
  cadastro, mas obrigatório para fechar pedido (validação na fase 4).

### Catálogo e preço

- **Vitrine pública:** qualquer visitante vê produtos, fotos, especificações
  e baixa o **manual** na página do produto (como hoje).
- **Preço, desconto e compra:** só para cliente logado e ativo.
- **Preço base:** um preço de tabela por produto.
- **Desconto do cliente:** percentual geral por cliente
  (`lojistas.desconto_percentual`), com **exceções por produto**
  (`lojista_descontos_produto`), definidos pelo admin.
- **Cupom:** código digitado no checkout; desconto em % ou valor fixo;
  validade; limite de usos; opcionalmente restrito a um cliente (base para
  campanhas futuras do tipo "faz tempo que não compra" via notificação no app).
- **Regra de combinação: vale o maior.** O sistema compara o desconto do
  cliente com o do cupom e aplica só o mais vantajoso, nunca os dois. Se o
  cupom for pior, a interface explica que o desconto atual já é melhor.

### Imposto interestadual (somente esqueleto)

- Hoje a venda é regional, mas o alvo é nacional. Nesta e na próxima fase
  fica só a estrutura:
  - produto com dados fiscais (NCM, origem da mercadoria, unidade);
  - tabela de alíquotas de ICMS por UF (populada apenas com a UF da Nex);
  - pedido com colunas de imposto (ICMS, DIFAL) que ficam zeradas;
  - cliente com indicador de contribuinte de ICMS (o que muda o cálculo em
    venda interestadual e é exigido pela NF-e).
- O cálculo real vive numa única função (fase 4) que por ora retorna "sem
  acréscimo". **A regra fiscal correta depende do contador** e não é
  definida aqui.

### Pagamento

- Gateway: **Stone**. As vendas online da Stone normalmente passam pelo
  **Pagar.me** (mesmo grupo) — confirmar com o gerente de conta qual produto
  foi contratado antes da fase 5. Nesta fase o banco só guarda
  `gateway_provider` e `gateway_transaction_id`.

## Abordagens consideradas

| | Onde ficam as regras | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | Regras de acesso e de preço no **Postgres** (RLS + funções SQL); integrações externas (Stone, Mainô, e-mail) em **Edge Functions** | Site e app usam a mesma regra sem duplicar; consultas de preço rápidas (uma ida ao banco); segredos isolados | Parte da lógica em SQL |
| B | Tudo em Edge Functions (TypeScript) | Uma linguagem só | Chamada extra em toda consulta de preço (mais lento); RLS continua necessária de qualquer forma |
| C | Regras no servidor do Next.js | Começo mais rápido | App dependeria do site ou duplicaria regras — contradiz o objetivo de reaproveitar no mobile |

**Escolha do usuário: A**, por ser a mais eficiente e servir site e app
igualmente.

## Requisitos de UX e desempenho

O usuário considera eficiência crucial: site e app não podem "ficar rodando"
para carregar. Pode enviar sites de concorrentes depois como referência;
nesta fase seguimos os padrões consolidados de e-commerce.

**Desempenho (orçamento):**
- Projeto Supabase na região **`sa-east-1` (São Paulo)** — menor latência
  para o público e dados no Brasil.
- Meta Core Web Vitals no p75 mobile: LCP < 2,5 s, INP < 200 ms, CLS < 0,1.
  Medir com Vercel Speed Insights (Analytics já está instalado).
- Server Components por padrão; `"use client"` só em ilhas interativas
  (formulários). Nada de bibliotecas pesadas de UI/estado nesta fase —
  Tailwind 4 (já usado) e componentes próprios.
- Páginas públicas continuam estáticas/ISR. Conteúdo dependente de login
  (preço) entra como trecho dinâmico com `Suspense` + skeleton (padrão já
  usado no `ProductCard`), sem tornar a página inteira dinâmica.
- Uma única ida ao banco por tela sempre que possível (selects com join, não
  N+1).

**Padrões de interface (área do cliente, login, admin):**
- Mobile-first; formulários em coluna única; rótulos visíveis (não só
  placeholder); atributos `autocomplete` corretos; mostrar/ocultar senha.
- Máscaras e validação de CPF/CNPJ (dígitos verificadores), CEP e telefone
  no cliente e no servidor; erros inline, em linguagem clara.
- **CEP preenche o endereço automaticamente** (ViaCEP), cliente só confirma
  número/complemento.
- Cabeçalho: "Entrar" para visitante; depois do login, "Olá, {nome}" com
  menu (Minha conta, Sair).
- Área do cliente com navegação lateral no desktop / abas no mobile:
  **Meus dados**, **Endereço**, (**Pedidos** a partir da fase 4),
  (**Segurança/senha** quando a flag for ligada). Itens futuros ficam
  ausentes, não "em breve".
- Feedback de ação sempre visível (salvando… / salvo / erro), botões
  desabilitados durante envio.
- Acessibilidade: contraste AA, foco visível, navegação por teclado.

**Idiomas:** o site é trilíngue (pt/en/es via `next-intl`); login e área do
cliente seguem os três idiomas. **Admin só em português** (uso interno).

## Arquitetura

```
supabase/                        (raiz do monorepo — compartilhado web/mobile)
  config.toml
  migrations/                    schema, RLS, funções, triggers
  tests/                         testes pgTAP de RLS
  functions/                     Edge Functions (fases 4–5; vazio por ora)

web/
  lib/supabase/
    client.ts    browser client (anon key) — componentes "use client"
    server.ts    server client (@supabase/ssr, cookies) — RSC, Server Actions
    admin.ts     service-role — importa "server-only"; SÓ Server Actions/
                 Route Handlers de admin
  lib/validacao/  cpf.ts, cnpj.ts, cep.ts (puros, testáveis, reusáveis no mobile)
  lib/flags.ts    feature flags (FEATURE_TROCA_SENHA)
  services/
    auth.ts       login, logout, trocar e-mail, trocar senha, sessão
    lojistas.ts   CRUD admin + leitura/edição pelo próprio cliente
  types/          Lojista.ts, Profile.ts, database.ts (gerado pelo Supabase)
  src/app/[locale]/
    cliente/login/page.tsx        login real (substitui a fachada)
    cliente/(area)/layout.tsx     exige sessão
    cliente/(area)/page.tsx       Meus dados
    cliente/(area)/endereco/page.tsx
    admin/layout.tsx              exige profiles.is_admin (checado no servidor)
    admin/lojistas/...            lista, novo, editar
  src/middleware.ts               next-intl → refresh de sessão Supabase →
                                  proteção de /cliente/* e /admin/*

.github/workflows/ci.yml          (ver "Ambientes e CI")
```

Princípio: **toda regra de acesso vive como RLS no Postgres**. O middleware e
os layouts só melhoram a experiência (redirecionar), não são a barreira de
segurança. O app vai falar direto com o mesmo projeto Supabase.

## Schema (Postgres)

```sql
-- ===== Identidade =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,                     -- usado no cabeçalho para admins
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
-- trigger: ao criar auth.users, cria profiles (is_admin=false)

create type tipo_pessoa as enum ('PF', 'PJ');
-- espelha o indIEDest da NF-e: 1 contribuinte, 2 isento, 9 não contribuinte
create type indicador_ie as enum ('contribuinte', 'isento', 'nao_contribuinte');

-- Usuários do Auth nunca são deletados (ver anonimização), por isso
-- `restrict`: impede apagar um cliente que tenha pedidos por engano.
create table lojistas (
  id uuid primary key references auth.users(id) on delete restrict,
  tipo_pessoa tipo_pessoa not null,
  documento text unique,                   -- só dígitos; CPF 11 / CNPJ 14;
                                           -- null SOMENTE após anonimização
  nome text not null,                      -- razão social (PJ) ou nome (PF)
  nome_fantasia text,
  email text not null,                     -- espelho de auth.users.email (trigger)
  inscricao_estadual text,
  indicador_ie indicador_ie not null default 'nao_contribuinte',
  responsavel_nome text,
  telefone text,
  whatsapp text,
  -- endereço único (opcional até o 1º pedido)
  cep text, logradouro text, numero text, complemento text,
  bairro text, cidade text, uf char(2),
  desconto_percentual numeric(5,2) not null default 0
    check (desconto_percentual between 0 and 100),
  ativo boolean not null default true,
  anonimizado_em timestamptz,              -- LGPD (ver abaixo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((documento is null and anonimizado_em is not null)
      or (tipo_pessoa = 'PF' and length(documento) = 11)
      or (tipo_pessoa = 'PJ' and length(documento) = 14))
);

-- Registro de acessos (Marco Civil, art. 15 — guardar 6 meses)
create table acessos_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ===== Catálogo (consumido na fase 2) =====
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique,
  codigo_antigo text,
  descricao text,               -- markdown (convertido do richtext do Strapi)
  aplicacoes text,              -- markdown
  compatibilidade text,
  destaque text,
  manual_url text,              -- Cloudinary (PDF), público
  -- fiscal (esqueleto)
  ncm char(8),
  origem smallint check (origem between 0 and 8),
  unidade text not null default 'UN',
  -- logística (frete na fase 4)
  peso_kg numeric(10,3),
  altura_cm numeric(8,2), largura_cm numeric(8,2), comprimento_cm numeric(8,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  url text not null, alt text, ordem int not null default 0
);

create table produto_especificacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  nome text not null, valor text not null, ordem int not null default 0
);

-- Preço em tabela SEPARADA: RLS é por linha, não por coluna. Visitante lê
-- `produtos`; `produto_precos` só responde a cliente logado/ativo ou admin.
create table produto_precos (
  produto_id uuid primary key references produtos(id) on delete cascade,
  preco numeric(12,2) not null check (preco >= 0),
  updated_at timestamptz not null default now()
);

create table lojista_descontos_produto (
  lojista_id uuid not null references lojistas(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  desconto_percentual numeric(5,2) not null check (desconto_percentual between 0 and 100),
  primary key (lojista_id, produto_id)
);

create type cupom_tipo as enum ('percentual', 'valor');

create table cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,             -- armazenado em MAIÚSCULAS
  tipo cupom_tipo not null,
  valor numeric(12,2) not null check (valor > 0),
  valor_minimo_pedido numeric(12,2),
  valido_de timestamptz,
  valido_ate timestamptz,
  max_usos int,                            -- null = ilimitado
  lojista_id uuid references lojistas(id) on delete cascade,  -- null = todos
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Esqueleto fiscal. Seed inicial: só PE (UF da Nex), alíquota interna
-- modal 20,5% (Lei PE 18.305/2023, vigente desde 01/01/2024). Para outras
-- UFs a interestadual a partir de PE é 12% (N/NE/CO/ES) ou 7% (S/SE exceto
-- ES) e 4% para importados — preenchido quando houver venda interestadual,
-- validado pelo contador.
create table aliquotas_icms_uf (
  uf char(2) primary key,
  aliquota_interna numeric(5,2) not null,
  aliquota_interestadual numeric(5,2)      -- a partir da UF da Nex
);

-- ===== Compra (fases 3–4) =====
create table carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  lojista_id uuid not null references lojistas(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade int not null check (quantidade > 0),
  updated_at timestamptz not null default now(),
  unique (lojista_id, produto_id)
);

create type pedido_status as enum (
  'aguardando_pagamento', 'pago', 'faturado', 'enviado', 'entregue',
  'cancelado', 'erro_pagamento', 'devolvido'
);
create type desconto_origem as enum ('nenhum', 'cliente', 'cupom');

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,  -- número amigável
  lojista_id uuid not null references lojistas(id),
  status pedido_status not null default 'aguardando_pagamento',
  -- snapshot do cliente no momento do pedido (cadastro pode mudar depois;
  -- tipo_pessoa define direito de arrependimento PF — CDC art. 49)
  cliente_tipo_pessoa tipo_pessoa not null,
  cliente_documento text not null,
  cliente_nome text not null,
  cliente_indicador_ie indicador_ie not null,
  cliente_inscricao_estadual text,
  entrega_cep text not null, entrega_logradouro text not null,
  entrega_numero text not null, entrega_complemento text,
  entrega_bairro text not null, entrega_cidade text not null,
  entrega_uf char(2) not null,
  -- valores
  subtotal numeric(12,2) not null,
  desconto_origem desconto_origem not null default 'nenhum',
  cupom_id uuid references cupons(id),
  desconto_valor numeric(12,2) not null default 0,
  frete_valor numeric(12,2) not null default 0,
  icms_valor numeric(12,2) not null default 0,     -- esqueleto
  difal_valor numeric(12,2) not null default 0,    -- esqueleto
  total numeric(12,2) not null,
  -- pagamento (Stone)
  metodo_pagamento text check (metodo_pagamento in ('pix','boleto','cartao')),
  gateway_provider text,                -- 'mock' | 'stone'
  gateway_transaction_id text,
  status_pagamento text,
  -- nota fiscal (Mainô)
  maino_nota_id text,
  maino_nota_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  produto_nome text not null,           -- snapshot
  produto_codigo text not null,         -- snapshot
  quantidade int not null check (quantidade > 0),
  preco_tabela numeric(12,2) not null,
  desconto_percentual numeric(5,2) not null default 0,
  preco_unitario numeric(12,2) not null  -- preço final aplicado
);
```

Triggers: `updated_at` automático; criação de `profiles` ao criar usuário;
sincronização `auth.users.email → lojistas.email` quando o cliente confirma
troca de e-mail.

### Regras de acesso (RLS)

Funções auxiliares `security definer` (evitam recursão de RLS):
`is_admin()` e `is_lojista_ativo()`.

| Tabela | Visitante (anon) | Cliente logado | Admin |
|---|---|---|---|
| `profiles` | — | lê a própria | tudo |
| `lojistas` | — | lê a própria linha; **update só nas colunas editáveis** (via `GRANT UPDATE (colunas)` — exclui documento, tipo_pessoa, nome, desconto, ativo, email) | tudo |
| `produtos`, `produto_imagens`, `produto_especificacoes` | lê ativos | lê ativos | tudo |
| `produto_precos` | **nada** | lê, se `is_lojista_ativo()` | tudo |
| `lojista_descontos_produto` | — | lê os próprios | tudo |
| `cupons` | — | **sem leitura direta**; validação por função (fase 4) para não permitir listar códigos | tudo |
| `aliquotas_icms_uf` | — | lê | tudo |
| `carrinho_itens` | — | CRUD nas próprias (se ativo) | lê |
| `pedidos`, `pedido_itens` | — | lê os próprios; criação só via função de checkout (fase 4) | tudo |
| `acessos_log` | — | — | lê |

Inserção/exclusão de `lojistas` e criação de usuários: **só Service Role**
(Server Actions de admin). Cliente desativado (`ativo = false`) continua
podendo logar e ver os próprios dados, mas não vê preços nem compra.

## Fluxos

### Admin cadastra cliente
1. `/admin/lojistas/novo`: tipo de pessoa, CPF/CNPJ (validado), nome/razão
   social, e-mail, desconto % (opcional).
2. Server Action com `admin.ts`: `auth.admin.createUser({ email, password,
   email_confirm: true })` com senha forte gerada; `insert` em `lojistas`.
   Se o insert falhar, remove o usuário criado (sem órfãos).
3. A senha provisória aparece **uma única vez** para o admin copiar e enviar
   por fora (WhatsApp/e-mail). Não é armazenada em lugar nenhum além do Auth.
4. `/admin/lojistas`: lista com busca por nome/documento, editar, ativar/
   desativar, **gerar nova senha provisória**, **anonimizar** (LGPD).

### Contas de admin
- Admin é um funcionário da Nex **sem linha em `lojistas`**; só
  `profiles` (com `nome` e `is_admin = true`). Uma conta não é cliente e
  admin ao mesmo tempo.
- Admin entra pela mesma tela `/cliente/login`; após login, quem é admin vai
  para `/admin/lojistas`, cliente vai para `/cliente`. O layout de
  `/cliente/(area)` redireciona admins para `/admin`.
- Primeiro admin (bootstrap): criar o usuário em Authentication → Users no
  painel do Supabase, depois `update profiles set is_admin = true, nome =
  '...' where id = ...` no SQL editor. Documentado no README.

### Login do cliente
1. `/cliente/login`: e-mail + senha via **Server Action** (não direto do
   navegador), que chama `signInWithPassword` com o server client e grava
   `acessos_log` com o IP real (cabeçalhos da Vercel) usando o client admin.
   Mensagem de erro genérica ("e-mail ou senha inválidos"). No app (futuro),
   o login passa por uma Edge Function equivalente, para o log continuar
   confiável.
2. Middleware: next-intl → refresh de sessão (`@supabase/ssr`) → `/cliente/*`
   sem sessão redireciona ao login (preservando destino); `/admin/*` sem
   admin redireciona.
3. Logout no menu do cabeçalho.

### Área do cliente
- **Meus dados:** documento e nome (somente leitura), nome fantasia,
  responsável, telefone, WhatsApp, IE + indicador. E-mail com ação "alterar"
  → **"Secure email change" do Supabase ligado**: confirmação enviada ao
  e-mail antigo e ao novo (protege contra sequestro de conta); a tela mostra
  "aguardando confirmação nos dois e-mails". O link leva a uma rota de
  callback que carrega o idioma do cliente como parâmetro; os e-mails em si
  são só em português nesta fase.
- **Endereço:** CEP com preenchimento automático; demais campos editáveis.
- **Senha:** fluxo `auth.updateUser({ password })` implementado, exibido
  só com `FEATURE_TROCA_SENHA=true` (padrão `false`).

## Conformidade legal

- **LGPD:**
  - Minimização: só dados necessários para venda, entrega e nota fiscal.
  - Base legal: execução de contrato e obrigação legal (fiscal).
  - Acesso e correção: o próprio cliente vê e edita na área do cliente.
  - Exclusão: ação admin "anonimizar". O usuário do Auth **não é deletado**:
    é banido permanentemente e tem o e-mail trocado por um endereço neutro
    (`anonimizado-<id>@invalid`). Em `lojistas`: `documento = null`, nome
    "Cliente anonimizado", contatos e endereço apagados, `ativo = false`,
    `anonimizado_em = now()`. O CPF/CNPJ fica livre para um novo cadastro
    futuro. **Pedidos mantêm seus snapshots fiscais** (guarda de 5 anos,
    LGPD art. 16, I). O pedido de exclusão chega pelo contato do site.
  - Segurança: RLS em todas as tabelas, Service Role só no servidor,
    dados hospedados no Brasil.
  - Atualizar a política de privacidade existente (pt/en/es) com cadastro,
    compras, dados coletados, retenção e contato do encarregado.
- **Marco Civil (art. 15):** `acessos_log` guardado por 6 meses; limpeza
  automática após 6 meses via `pg_cron`. (O log nativo do Supabase tem
  retenção curta no plano gratuito, por isso a tabela própria.)
- **Decreto 7.962/2013 (e-commerce):** CNPJ, razão social e endereço da Nex
  visíveis no rodapé (verificar se já estão); resumo antes do pagamento e
  confirmação por e-mail ficam na fase 4.
- **CDC art. 49:** cliente PF tem 7 dias para desistir de compra online. O
  pedido guarda `cliente_tipo_pessoa` e há status `devolvido`; o fluxo de
  devolução é da fase 4. Confirmar com advogado/contador a aplicação a PJ.

## E-mail transacional

A troca de e-mail precisa enviar confirmação já nesta fase. O SMTP padrão do
Supabase tem limite baixo de envio e não serve para produção. Configurar
**SMTP próprio** no Supabase Auth (escolha do builder: Resend, pelo plano
gratuito e boa entregabilidade), com remetente no domínio da Nex e
templates em português.

## Variáveis de ambiente (`web/.env.local` e Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # só servidor, nunca NEXT_PUBLIC_
FEATURE_TROCA_SENHA=false
```

## Dados da empresa

- Razão social: **Nex Controls do Brasil LTDA**
- UF: **Pernambuco (PE)**
- Contato de privacidade / encarregado (LGPD): **contato@nexcontrols.com**
- CNPJ e endereço completo: **pendentes** — o usuário fornece depois. O
  build usa placeholders marcados `TODO` no rodapé e na política de
  privacidade; publicar em produção exige preenchê-los.

## Ambientes e CI

**Plano: Supabase gratuito** em staging e produção (decisão do usuário:
custo baixo, poucos clientes no início; migrar de plano/estrutura depois).
Consequências assumidas e mitigadas:
- Projeto gratuito **pausa após 7 dias sem atividade** → workflow agendado
  no GitHub Actions faz uma consulta leve a cada 3 dias nos dois projetos.
- Backup limitado → workflow semanal faz `pg_dump` da produção,
  **criptografa** (gpg simétrico, senha em GitHub Secret) e guarda como
  artefato do GitHub Actions (retenção 90 dias). Criptografia obrigatória:
  o dump tem dados pessoais (LGPD) e artefatos podem ser baixados por quem
  tem acesso ao repositório.
- Revisitar o plano antes de abrir vendas (fase 4).

- **Local:** Supabase CLI em Docker para desenvolvimento e testes.
- **Staging:** projeto Supabase separado, usado pelos previews da Vercel.
  Previews **nunca** apontam para o banco de produção.
- **Produção:** projeto Supabase de produção, usado só pelo deploy de `main`.
- **CI (GitHub Actions — o repositório está no GitHub):** em todo PR, sobe o
  Supabase local, roda migrations, pgTAP, Vitest, Playwright e o scan de
  segredos. No merge para `main`, aplica as migrations em staging e depois
  em produção (`supabase db push`).

## Testes desta fase

- **Segurança (pgTAP, `supabase test db`):** para cada tabela, simular
  visitante, cliente A, cliente B, cliente desativado e admin. Casos
  obrigatórios: visitante não lê `produto_precos`; cliente A não lê nem
  altera dados de B; cliente não altera documento/desconto/ativo próprios;
  cliente não lê `cupons`; desativado não lê preços.
- **Unitários (Vitest):** validação de CPF, CNPJ, CEP; geração de senha;
  mapeamento de erros de auth para mensagens.
- **Ponta a ponta (Playwright, contra Supabase local):** admin cadastra
  cliente → cliente loga com a senha provisória → edita endereço via CEP →
  logout; senha errada; acesso a `/cliente` e `/admin` sem sessão
  redireciona; cliente comum não acessa `/admin`.
- **Segredos:** script no CI que procura a Service Role Key no build
  (`.next/static`) e falha se encontrar; `admin.ts` importa `server-only`.

## Não incluído nesta fase

- Migração do Strapi e UI de catálogo/preço (fase 2). Strapi continua no ar;
  `services/strapi.ts` não é tocado.
- Carrinho, checkout, cálculo de desconto/cupom/imposto, Stone, Mainô,
  pedidos na área do cliente.
- "Esqueci minha senha" automático e troca de senha visível.
- App mobile (só a estrutura compartilhada `supabase/` e `lib/validacao`).

## Documentação

- `web/README.md`: criar projeto Supabase (região `sa-east-1`), variáveis,
  rodar migrations e testes localmente, configurar SMTP, criar o primeiro
  admin via SQL (`update profiles set is_admin = true where id = ...`).
- `docs/architecture.md`: decisão Supabase-only (abordagem A) e como o
  `mobile/` deve consumir as mesmas tabelas/RLS.

## Deixado para o builder

- Estrutura interna dos componentes, nomes de arquivos fora dos listados,
  biblioteca de máscara (ou máscara própria leve).
- Configuração do Supabase local no Windows (Docker Desktop) para testes.
