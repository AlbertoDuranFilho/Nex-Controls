-- Identidade: profiles, lojistas, acessos_log + RLS, funções e triggers.
-- Spec: docs/superpowers/specs/2026-09-15-supabase-foundation-auth-design.md

create type public.tipo_pessoa as enum ('PF', 'PJ');
-- espelha o indIEDest da NF-e: 1 contribuinte, 2 isento, 9 não contribuinte
create type public.indicador_ie as enum ('contribuinte', 'isento', 'nao_contribuinte');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,                     -- usado no cabeçalho para admins
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Usuários do Auth nunca são deletados (ver anonimização), por isso
-- `restrict`: impede apagar um cliente que tenha pedidos por engano.
create table public.lojistas (
  id uuid primary key references auth.users(id) on delete restrict,
  tipo_pessoa public.tipo_pessoa not null,
  documento text unique,                   -- só dígitos; CPF 11 / CNPJ 14;
                                           -- null SOMENTE após anonimização
  nome text not null,                      -- razão social (PJ) ou nome (PF)
  nome_fantasia text,
  email text not null,                     -- espelho de auth.users.email (trigger)
  inscricao_estadual text,
  indicador_ie public.indicador_ie not null default 'nao_contribuinte',
  responsavel_nome text,
  telefone text,
  whatsapp text,
  -- endereço único (opcional até o 1º pedido)
  cep text, logradouro text, numero text, complemento text,
  bairro text, cidade text, uf char(2),
  desconto_percentual numeric(5,2) not null default 0
    check (desconto_percentual between 0 and 100),
  ativo boolean not null default true,
  anonimizado_em timestamptz,              -- LGPD
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((documento is null and anonimizado_em is not null)
      or (tipo_pessoa = 'PF' and documento is not null and length(documento) = 11)
      or (tipo_pessoa = 'PJ' and documento is not null and length(documento) = 14))
);

-- Registro de acessos (Marco Civil, art. 15 — guardar 6 meses)
create table public.acessos_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ===== Funções auxiliares (security definer evita recursão de RLS) =====
create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.is_lojista_ativo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.lojistas where id = auth.uid() and ativo);
$$;

-- ===== Triggers =====
create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lojistas_set_updated_at
  before update on public.lojistas
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.lojistas set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_changed();

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.lojistas enable row level security;
alter table public.acessos_log enable row level security;

-- Escritas em identidade: só service role (Server Actions de admin).
-- Admin tem policy apenas de leitura por `authenticated`.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy lojistas_select on public.lojistas
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy lojistas_update_proprio on public.lojistas
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy acessos_log_select_admin on public.acessos_log
  for select to authenticated
  using (public.is_admin());

-- ===== Grants =====
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.lojistas from anon, authenticated;
grant update (nome_fantasia, inscricao_estadual, indicador_ie, responsavel_nome, telefone, whatsapp,
  cep, logradouro, numero, complemento, bairro, cidade, uf) on public.lojistas to authenticated;
-- acessos_log: escrita só service role; leitura só admin (policy acima)
revoke all on public.acessos_log from anon, authenticated;
grant select on public.acessos_log to authenticated;
