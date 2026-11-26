-- Fase 5a: NF-e automática pela Mainô. Colunas de acompanhamento, cache do token
-- da integração e registro do resultado (chamado só pelo servidor, service role).

alter table public.pedidos
  add column maino_pedido_id text,
  add column nfe_status text check (nfe_status in
    ('NAO_TRANSMITIDA', 'EM_TRANSMISSAO', 'ACEITA', 'REJEITADA', 'CANCELADA', 'DENEGADA')),
  add column nfe_erro text,
  add column nfe_atualizado_em timestamptz;

-- Cache do access token por provedor: sem policies, só a service role (que ignora RLS) acessa.
create table public.integracao_tokens (
  provedor text primary key,
  access_token text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.integracao_tokens enable row level security;
revoke all on public.integracao_tokens from anon, authenticated;

-- Registra o andamento da NF-e. Com NF aceita num pedido pago, fatura o pedido.
-- Retorna true só quando esta chamada faturou o pedido.
create function public.sistema_registrar_nfe(
  p_pedido_id uuid,
  p_maino_pedido_id text default null,
  p_nfe_status text default null,
  p_chave text default null,
  p_danfe_url text default null,
  p_erro text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_ped public.pedidos%rowtype;
begin
  select * into v_ped from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'pedido_nao_encontrado';
  end if;

  if p_danfe_url is not null and p_danfe_url not like 'https://%' then
    raise exception 'url_invalida';
  end if;

  if p_maino_pedido_id is not null
     and v_ped.maino_pedido_id is not null
     and v_ped.maino_pedido_id <> p_maino_pedido_id then
    raise exception 'maino_pedido_divergente';
  end if;

  update public.pedidos set
    maino_pedido_id = coalesce(maino_pedido_id, p_maino_pedido_id),
    nfe_status = coalesce(p_nfe_status, nfe_status),
    maino_nota_id = coalesce(p_chave, maino_nota_id),
    maino_nota_url = coalesce(p_danfe_url, maino_nota_url),
    nfe_erro = p_erro,
    nfe_atualizado_em = now()
  where id = p_pedido_id;

  if p_nfe_status = 'ACEITA' and v_ped.status = 'pago' then
    update public.pedidos set status = 'faturado' where id = p_pedido_id;
    insert into public.pedido_eventos (pedido_id, status_de, status_para, admin_id)
    values (p_pedido_id, 'pago', 'faturado', null);
    return true;
  end if;
  return false;
end;
$$;

revoke execute on function public.sistema_registrar_nfe(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.sistema_registrar_nfe(uuid, text, text, text, text, text) to service_role;
