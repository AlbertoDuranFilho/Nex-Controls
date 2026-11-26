-- Catálogo, preços, cupons, alíquotas, carrinho e pedidos + RLS e job de limpeza.
-- Spec: docs/superpowers/specs/2026-09-15-supabase-foundation-auth-design.md

-- ===== Catálogo =====
create table public.produtos (
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

create table public.produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null, alt text, ordem int not null default 0
);

create table public.produto_especificacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome text not null, valor text not null, ordem int not null default 0
);

-- Preço em tabela SEPARADA: RLS é por linha, não por coluna. Visitante lê
-- `produtos`; `produto_precos` só responde a cliente logado/ativo ou admin.
create table public.produto_precos (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  preco numeric(12,2) not null check (preco >= 0),
  updated_at timestamptz not null default now()
);

create table public.lojista_descontos_produto (
  lojista_id uuid not null references public.lojistas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  desconto_percentual numeric(5,2) not null check (desconto_percentual between 0 and 100),
  primary key (lojista_id, produto_id)
);

create type public.cupom_tipo as enum ('percentual', 'valor');

create table public.cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,             -- armazenado em MAIÚSCULAS
  tipo public.cupom_tipo not null,
  valor numeric(12,2) not null check (valor > 0),
  valor_minimo_pedido numeric(12,2),
  valido_de timestamptz,
  valido_ate timestamptz,
  max_usos int,                            -- null = ilimitado
  lojista_id uuid references public.lojistas(id) on delete cascade,  -- null = todos
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Esqueleto fiscal. Seed inicial: só PE (UF da Nex), alíquota interna modal
-- 20,5% (Lei PE 18.305/2023). Interestaduais preenchidas quando houver venda
-- interestadual, validadas pelo contador.
create table public.aliquotas_icms_uf (
  uf char(2) primary key,
  aliquota_interna numeric(5,2) not null,
  aliquota_interestadual numeric(5,2)      -- a partir da UF da Nex
);

insert into public.aliquotas_icms_uf values ('PE', 20.50, null);

-- ===== Compra =====
create table public.carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  lojista_id uuid not null references public.lojistas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  quantidade int not null check (quantidade > 0),
  updated_at timestamptz not null default now(),
  unique (lojista_id, produto_id)
);

create type public.pedido_status as enum (
  'aguardando_pagamento', 'pago', 'faturado', 'enviado', 'entregue',
  'cancelado', 'erro_pagamento', 'devolvido'
);
create type public.desconto_origem as enum ('nenhum', 'cliente', 'cupom');

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,  -- número amigável
  lojista_id uuid not null references public.lojistas(id),
  status public.pedido_status not null default 'aguardando_pagamento',
  -- snapshot do cliente no momento do pedido (cadastro pode mudar depois;
  -- tipo_pessoa define direito de arrependimento PF — CDC art. 49)
  cliente_tipo_pessoa public.tipo_pessoa not null,
  cliente_documento text not null,
  cliente_nome text not null,
  cliente_indicador_ie public.indicador_ie not null,
  cliente_inscricao_estadual text,
  entrega_cep text not null, entrega_logradouro text not null,
  entrega_numero text not null, entrega_complemento text,
  entrega_bairro text not null, entrega_cidade text not null,
  entrega_uf char(2) not null,
  -- valores
  subtotal numeric(12,2) not null,
  desconto_origem public.desconto_origem not null default 'nenhum',
  cupom_id uuid references public.cupons(id),
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

create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  produto_nome text not null,           -- snapshot
  produto_codigo text not null,         -- snapshot
  quantidade int not null check (quantidade > 0),
  preco_tabela numeric(12,2) not null,
  desconto_percentual numeric(5,2) not null default 0,
  preco_unitario numeric(12,2) not null  -- preço final aplicado
);

-- ===== Triggers updated_at =====
create trigger produtos_set_updated_at before update on public.produtos
  for each row execute function public.set_updated_at();
create trigger produto_precos_set_updated_at before update on public.produto_precos
  for each row execute function public.set_updated_at();
create trigger carrinho_itens_set_updated_at before update on public.carrinho_itens
  for each row execute function public.set_updated_at();
create trigger pedidos_set_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ===== RLS =====
alter table public.produtos enable row level security;
alter table public.produto_imagens enable row level security;
alter table public.produto_especificacoes enable row level security;
alter table public.produto_precos enable row level security;
alter table public.lojista_descontos_produto enable row level security;
alter table public.cupons enable row level security;
alter table public.aliquotas_icms_uf enable row level security;
alter table public.carrinho_itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

-- Catálogo público: visitante e cliente leem ativos; admin tudo.
create policy produtos_select on public.produtos
  for select to anon, authenticated using (ativo or public.is_admin());
create policy produtos_admin on public.produtos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy produto_imagens_select on public.produto_imagens
  for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.produtos p where p.id = produto_id and p.ativo));
create policy produto_imagens_admin on public.produto_imagens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy produto_especificacoes_select on public.produto_especificacoes
  for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.produtos p where p.id = produto_id and p.ativo));
create policy produto_especificacoes_admin on public.produto_especificacoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Preço: só lojista ativo ou admin.
create policy produto_precos_select on public.produto_precos
  for select to authenticated using (public.is_lojista_ativo());
create policy produto_precos_admin on public.produto_precos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lojista_descontos_select on public.lojista_descontos_produto
  for select to authenticated using (lojista_id = auth.uid());
create policy lojista_descontos_admin on public.lojista_descontos_produto
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Cupons: sem leitura por cliente (validação por função na fase 4).
create policy cupons_admin on public.cupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy aliquotas_select on public.aliquotas_icms_uf
  for select to authenticated using (true);
create policy aliquotas_admin on public.aliquotas_icms_uf
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Carrinho: CRUD nas próprias linhas (se ativo); admin só lê.
create policy carrinho_itens_proprio on public.carrinho_itens
  for all to authenticated
  using (lojista_id = auth.uid() and public.is_lojista_ativo())
  with check (lojista_id = auth.uid() and public.is_lojista_ativo());
create policy carrinho_itens_select_admin on public.carrinho_itens
  for select to authenticated using (public.is_admin());

-- Pedidos: só leitura (próprios ou admin). Criação via função de checkout (fase 4).
create policy pedidos_select on public.pedidos
  for select to authenticated using (lojista_id = auth.uid() or public.is_admin());
create policy pedido_itens_select on public.pedido_itens
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.pedidos p where p.id = pedido_id and p.lojista_id = auth.uid()));

-- ===== Grants =====
-- revoke all tira também TRUNCATE (ignora RLS), TRIGGER e REFERENCES.
revoke all on public.produtos, public.produto_imagens, public.produto_especificacoes,
  public.produto_precos, public.lojista_descontos_produto, public.cupons,
  public.aliquotas_icms_uf, public.carrinho_itens, public.pedidos, public.pedido_itens
  from anon, authenticated;

grant select on public.produtos, public.produto_imagens, public.produto_especificacoes to anon;

-- escrita das tabelas de catálogo/admin só passa por policy de admin
grant select, insert, update, delete on public.produtos, public.produto_imagens,
  public.produto_especificacoes, public.produto_precos, public.lojista_descontos_produto,
  public.cupons, public.aliquotas_icms_uf, public.carrinho_itens to authenticated;
-- pedidos: somente leitura (criação via função na fase 4)
grant select on public.pedidos, public.pedido_itens to authenticated;

-- ===== Retenção de acessos_log (Marco Civil: 6 meses) =====
-- Em produção, se o comando falhar, habilitar pg_cron em Database > Extensions e rodar de novo.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'limpa_acessos_log',
  '0 3 * * *',
  $$delete from public.acessos_log where created_at < now() - interval '6 months'$$
);

-- sequence do identity: sem isso setval/nextval seriam liberados por default privileges
revoke all on sequence public.pedidos_numero_seq from anon, authenticated;
