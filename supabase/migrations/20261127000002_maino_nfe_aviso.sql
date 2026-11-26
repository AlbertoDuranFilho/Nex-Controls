-- Fase 5a (correção): o retorno de sistema_registrar_nfe passa a dizer "avise o cliente agora".
-- Antes era "esta chamada faturou o pedido"; com isso, uma nota ACEITA cuja DANFE só chegasse
-- numa consulta posterior nunca gerava o e-mail. A decisão fica sob o lock da linha, então
-- duas consultas simultâneas não enviam o e-mail duas vezes.
--
-- Retorna true quando, depois desta chamada, a NF-e está ACEITA com DANFE e:
--   * esta chamada faturou o pedido (pago -> faturado); ou
--   * a DANFE apareceu agora (antes era nula) num pedido já faturado ou adiante.

create or replace function public.sistema_registrar_nfe(
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
  v_faturou boolean := false;
  v_status_nfe text;
  v_url text;
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
    v_faturou := true;
  end if;

  v_status_nfe := coalesce(p_nfe_status, v_ped.nfe_status);
  v_url := coalesce(p_danfe_url, v_ped.maino_nota_url);

  return v_status_nfe = 'ACEITA' and v_url is not null and (
    v_faturou
    or (v_ped.maino_nota_url is null
        and v_ped.status in ('faturado', 'enviado', 'entregue'))
  );
end;
$$;

revoke execute on function public.sistema_registrar_nfe(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.sistema_registrar_nfe(uuid, text, text, text, text, text) to service_role;
