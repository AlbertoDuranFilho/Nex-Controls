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
      or (tipo_pessoa = 'PF' and documento is not null and documento ~ '^\d{11}$')
      or (tipo_pessoa = 'PJ' and documento is not null and documento ~ '^\d{14}$'))
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

-- Anonimizado não escreve: o JWT dele pode seguir válido até expirar (o ban só
-- vale na emissão de tokens), então a checagem precisa estar na policy.
create policy lojistas_update_proprio on public.lojistas
  for update to authenticated
  using (id = auth.uid() and anonimizado_em is null)
  with check (id = auth.uid() and anonimizado_em is null);

create policy acessos_log_select_admin on public.acessos_log
  for select to authenticated
  using (public.is_admin());

-- ===== Grants =====
-- revoke all tira também TRUNCATE (ignora RLS), TRIGGER e REFERENCES; anon fica sem nada.
revoke all on public.profiles, public.lojistas from anon, authenticated;
grant select on public.profiles, public.lojistas to authenticated;
grant update (nome_fantasia, inscricao_estadual, indicador_ie, responsavel_nome, telefone, whatsapp,
  cep, logradouro, numero, complemento, bairro, cidade, uf) on public.lojistas to authenticated;
-- acessos_log: escrita só service role; leitura só admin (policy acima)
revoke all on public.acessos_log from anon, authenticated;
grant select on public.acessos_log to authenticated;

revoke all on sequence public.acessos_log_id_seq from anon, authenticated;

-- ===== LGPD: anonimização no schema auth =====
-- O updateUserById (GoTrue) troca o e-mail e bane, mas deixa PII em
-- raw_user_meta_data, identities.identity_data, tokens pendentes, sessões e
-- audit_log_entries. Esta função limpa o resto. Chamada só pela service role
-- (Server Action anonimizarLojista), depois do updateUserById.
-- Tokens/e-mail pendente viram '' (o GoTrue lê essas colunas como string e
-- quebra com NULL); phone vira NULL (default da coluna e índice único).
create function public.anonimizar_auth(uid uuid, email_anonimo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set
    email = email_anonimo,
    raw_user_meta_data = '{}'::jsonb,
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    confirmation_token = '',
    recovery_token = '',
    reauthentication_token = '',
    phone_change_token = '',
    phone = null,
    phone_change = ''
  where id = uid;

  -- identities.email é coluna gerada a partir de identity_data
  update auth.identities set
    identity_data = pg_catalog.jsonb_build_object('sub', uid::text, 'email', email_anonimo)
  where user_id = uid;

  -- refresh_tokens caem em cascata com sessions; o delete direto cobre os antigos sem session_id
  delete from auth.sessions where user_id = uid;
  delete from auth.refresh_tokens where user_id = uid::text;
  delete from auth.one_time_tokens where user_id = uid;
  delete from auth.audit_log_entries
  where payload->>'actor_id' = uid::text
     or payload->'traits'->>'user_id' = uid::text;
end;
$$;

revoke execute on function public.anonimizar_auth(uuid, text) from public, anon, authenticated;
grant execute on function public.anonimizar_auth(uuid, text) to service_role;
