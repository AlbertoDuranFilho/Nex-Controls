-- Contagem de usos de cupons por agregação no banco (o PostgREST limita linhas por resposta).
-- Só a service role executa: o painel admin lê com createAdminClient.
create function public.admin_usos_cupons()
returns table (cupom_id uuid, usos bigint)
language sql stable security invoker set search_path = ''
as $$
  select p.cupom_id, count(*)::bigint
  from public.pedidos p
  where p.cupom_id is not null and p.status <> 'cancelado'
  group by p.cupom_id;
$$;

revoke execute on function public.admin_usos_cupons() from public, anon, authenticated;
grant execute on function public.admin_usos_cupons() to service_role;
