-- Pedido: cálculo (vale o maior entre desconto do cliente e cupom), simulação,
-- criação do pedido sem pagamento online, eventos de status e atualização pelo admin.
-- Plano: docs/superpowers/plans/2026-11-25-fase2-4-catalogo-carrinho-pedido.md (Task 2)

-- ===== Colunas =====
alter table public.pedidos
  add column observacao text check (char_length(observacao) <= 500),
  add column notificado_em timestamptz;

-- ===== Eventos de status =====
create table public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  status_de public.pedido_status,
  status_para public.pedido_status not null,
  admin_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index pedido_eventos_pedido_id_idx on public.pedido_eventos (pedido_id);
create index pedidos_cupom_id_idx on public.pedidos (cupom_id) where cupom_id is not null;

alter table public.pedido_eventos enable row level security;

create policy pedido_eventos_select_admin on public.pedido_eventos
  for select to authenticated using (public.is_admin());
create policy pedido_eventos_select_proprio on public.pedido_eventos
  for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.lojista_id = auth.uid()));

-- Cliente não vê quem mudou o status: grant só nas outras colunas. Escrita só por função.
-- (O admin lê admin_id pela service role.)
revoke all on public.pedido_eventos from anon, authenticated;
grant select (id, pedido_id, status_de, status_para, criado_em) on public.pedido_eventos to authenticated;

-- ===== Impostos (esqueleto) =====
create function public.calcular_impostos(p_uf_destino char(2), p_indicador_ie public.indicador_ie, p_base numeric)
returns table (icms numeric, difal numeric)
language sql immutable set search_path = '' as $$
  select 0::numeric(12,2), 0::numeric(12,2);
$$;

-- ===== Cálculo =====
-- Itens do carrinho de um lojista explícito, com preço e desconto por unidade.
-- Mesma regra de precos_cliente (que usa auth.uid() e RLS): exceção do produto,
-- senão desconto geral do cliente, senão 0; preço = round(preco * (1 - pct/100), 2).
-- Interna: só o owner executa (chamada pelas funções security definer abaixo).
create function public._itens_carrinho(p_lojista uuid)
returns table (produto_id uuid, codigo text, nome text, quantidade int,
               preco_tabela numeric, desconto_percentual numeric, preco_cliente numeric, motivo text)
language sql stable set search_path = '' as $$
  select ci.produto_id, p.codigo, p.nome, ci.quantidade,
         pp.preco, d.pct, round(pp.preco * (1 - d.pct / 100), 2),
         case when not p.ativo then 'inativo' when pp.preco is null then 'sem_preco' end
  from public.carrinho_itens ci
  join public.produtos p on p.id = ci.produto_id
  left join public.produto_precos pp on pp.produto_id = ci.produto_id
  left join public.lojista_descontos_produto ldp
    on ldp.lojista_id = ci.lojista_id and ldp.produto_id = ci.produto_id
  left join public.lojistas l on l.id = ci.lojista_id
  cross join lateral (select coalesce(ldp.desconto_percentual, l.desconto_percentual, 0) as pct) d
  where ci.lojista_id = p_lojista;
$$;

-- Resumo do pedido para um lojista explícito (não usa auth.uid()).
-- Vale o maior: o cupom vence só se o desconto dele (em reais) for estritamente
-- maior que o desconto do cliente. Itens inválidos ficam fora dos valores.
create function public._calcular_pedido(p_lojista uuid, p_cupom text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_l public.lojistas%rowtype;
  v_codigo text := nullif(upper(trim(p_cupom)), '');
  v_c public.cupons%rowtype;
  v_qtd_itens int;
  v_invalidos int;
  v_subtotal numeric(12,2);
  v_desc_cliente numeric(12,2);
  v_desc_cupom numeric(12,2) := 0;
  v_situacao text := 'ausente';
  v_motivo text;
  v_valor_minimo numeric(12,2);
  v_cupom_vence boolean := false;
  v_desc_aplicado numeric(12,2);
  v_origem text;
  v_base numeric(12,2);
  v_icms numeric(12,2);
  v_difal numeric(12,2);
  v_frete numeric(12,2) := 0;
  v_itens jsonb;
  v_bloqueios text[] := '{}';
begin
  select * into v_l from public.lojistas where id = p_lojista;

  select count(*)::int,
         (count(*) filter (where i.motivo is not null))::int,
         coalesce(sum(i.preco_tabela * i.quantidade) filter (where i.motivo is null), 0),
         coalesce(sum((i.preco_tabela - i.preco_cliente) * i.quantidade) filter (where i.motivo is null), 0)
    into v_qtd_itens, v_invalidos, v_subtotal, v_desc_cliente
  from public._itens_carrinho(p_lojista) i;

  -- Cupom (de outro cliente responde "inexistente")
  if v_codigo is not null then
    v_situacao := 'invalido';
    select * into v_c from public.cupons c
    where c.codigo = v_codigo and (c.lojista_id is null or c.lojista_id = p_lojista);

    if v_c.id is null then
      v_motivo := 'inexistente';
    elsif not v_c.ativo then
      v_motivo := 'inativo';
    elsif (v_c.valido_de is not null and now() < v_c.valido_de)
       or (v_c.valido_ate is not null and now() > v_c.valido_ate) then
      v_motivo := 'fora_validade';
    elsif v_c.max_usos is not null and (
        select count(*) from public.pedidos pe
        where pe.cupom_id = v_c.id and pe.status <> 'cancelado') >= v_c.max_usos then
      v_motivo := 'esgotado';
    elsif exists (select 1 from public.pedidos pe
        where pe.cupom_id = v_c.id and pe.lojista_id = p_lojista and pe.status <> 'cancelado') then
      v_motivo := 'ja_usado';
    elsif v_c.valor_minimo_pedido is not null and v_subtotal < v_c.valor_minimo_pedido then
      v_motivo := 'valor_minimo';
      v_valor_minimo := v_c.valor_minimo_pedido;
    else
      v_desc_cupom := case v_c.tipo
        when 'percentual' then round(v_subtotal * v_c.valor / 100, 2)
        else least(v_c.valor, v_subtotal) end;
      v_cupom_vence := v_desc_cupom > v_desc_cliente;
      v_situacao := case when v_cupom_vence then 'aplicado' else 'pior' end;
    end if;
  end if;

  if v_cupom_vence then
    v_desc_aplicado := v_desc_cupom;
    v_origem := 'cupom';
  elsif v_desc_cliente > 0 then
    v_desc_aplicado := v_desc_cliente;
    v_origem := 'cliente';
  else
    v_desc_aplicado := 0;
    v_origem := 'nenhum';
  end if;

  v_base := v_subtotal - v_desc_aplicado;
  select ci.icms, ci.difal into v_icms, v_difal
  from public.calcular_impostos(v_l.uf, v_l.indicador_ie, v_base) ci;

  -- Com o cupom vencendo, o item vai a preço de tabela (sem desconto do cliente).
  select coalesce(jsonb_agg(jsonb_build_object(
           'produto_id', i.produto_id,
           'codigo', i.codigo,
           'nome', i.nome,
           'quantidade', i.quantidade,
           'preco_tabela', i.preco_tabela::numeric(12,2),
           'desconto_percentual', x.pct,
           'preco_unitario', x.unit,
           'total_linha', case when i.motivo is null then (x.unit * i.quantidade)::numeric(12,2) else 0::numeric(12,2) end,
           'valido', i.motivo is null,
           'motivo', i.motivo
         ) order by i.codigo), '[]'::jsonb)
    into v_itens
  from public._itens_carrinho(p_lojista) i
  cross join lateral (select
      (case when v_cupom_vence then 0 else i.desconto_percentual end)::numeric(5,2) as pct,
      (case when v_cupom_vence then i.preco_tabela else i.preco_cliente end)::numeric(12,2) as unit) x;

  if v_l.id is null or not v_l.ativo or v_l.anonimizado_em is not null then
    v_bloqueios := v_bloqueios || 'conta_inativa'::text;
  end if;
  if v_qtd_itens = 0 then
    v_bloqueios := v_bloqueios || 'carrinho_vazio'::text;
  end if;
  if coalesce(trim(v_l.cep), '') = '' or coalesce(trim(v_l.logradouro), '') = ''
     or coalesce(trim(v_l.numero), '') = '' or coalesce(trim(v_l.bairro), '') = ''
     or coalesce(trim(v_l.cidade), '') = '' or coalesce(trim(v_l.uf), '') = '' then
    v_bloqueios := v_bloqueios || 'sem_endereco'::text;
  end if;
  if v_invalidos > 0 then
    v_bloqueios := v_bloqueios || 'itens_invalidos'::text;
  end if;

  return jsonb_build_object(
    'itens', v_itens,
    'subtotal', v_subtotal,
    'desconto_cliente', v_desc_cliente,
    'desconto_cupom', v_desc_cupom,
    'desconto_aplicado', v_desc_aplicado,
    'desconto_origem', v_origem,
    'frete', v_frete,
    'icms', v_icms,
    'difal', v_difal,
    'total', (v_base + v_frete + v_icms + v_difal)::numeric(12,2),
    'cupom', jsonb_build_object(
      'codigo', v_codigo,
      'situacao', v_situacao,
      'motivo', v_motivo,
      'valor_minimo', v_valor_minimo),
    'bloqueios', to_jsonb(v_bloqueios)
  );
end;
$$;

-- ===== Funções do cliente =====
create function public.simular_pedido(p_cupom text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public._calcular_pedido(auth.uid(), p_cupom);
$$;

-- Trava o carrinho (e o cupom) antes de recalcular: duas chamadas simultâneas
-- se enfileiram e a segunda encontra o carrinho vazio.
create function public.criar_pedido(p_cupom text default null, p_observacao text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text := nullif(upper(trim(p_cupom)), '');
  v_obs text := nullif(trim(p_observacao), '');
  v_calc jsonb;
  v_l public.lojistas%rowtype;
  v_cupom_id uuid;
  v_id uuid;
  v_numero bigint;
begin
  perform 1 from public.carrinho_itens where lojista_id = v_uid for update;
  if v_codigo is not null then
    perform 1 from public.cupons where codigo = v_codigo for update;
  end if;

  v_calc := public._calcular_pedido(v_uid, p_cupom);

  if jsonb_array_length(v_calc->'bloqueios') > 0 then
    return jsonb_build_object('ok', false, 'erro', v_calc->'bloqueios'->>0);
  end if;
  if v_calc->'cupom'->>'situacao' = 'invalido' then
    return jsonb_build_object('ok', false, 'erro', 'cupom_invalido', 'motivo', v_calc->'cupom'->>'motivo');
  end if;
  if char_length(v_obs) > 500 then
    return jsonb_build_object('ok', false, 'erro', 'observacao_longa');
  end if;

  select * into v_l from public.lojistas where id = v_uid;
  if v_calc->'cupom'->>'situacao' = 'aplicado' then
    select id into v_cupom_id from public.cupons where codigo = v_codigo;
  end if;

  insert into public.pedidos (
    lojista_id, status,
    cliente_tipo_pessoa, cliente_documento, cliente_nome, cliente_indicador_ie, cliente_inscricao_estadual,
    entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento,
    entrega_bairro, entrega_cidade, entrega_uf,
    subtotal, desconto_origem, cupom_id, desconto_valor, frete_valor, icms_valor, difal_valor, total,
    gateway_provider, observacao)
  values (
    v_uid, 'aguardando_pagamento',
    v_l.tipo_pessoa, v_l.documento, v_l.nome, v_l.indicador_ie, v_l.inscricao_estadual,
    v_l.cep, v_l.logradouro, v_l.numero, v_l.complemento,
    v_l.bairro, v_l.cidade, v_l.uf,
    (v_calc->>'subtotal')::numeric, (v_calc->>'desconto_origem')::public.desconto_origem, v_cupom_id,
    (v_calc->>'desconto_aplicado')::numeric, (v_calc->>'frete')::numeric,
    (v_calc->>'icms')::numeric, (v_calc->>'difal')::numeric, (v_calc->>'total')::numeric,
    'manual', v_obs)
  returning id, numero into v_id, v_numero;

  insert into public.pedido_itens (pedido_id, produto_id, produto_nome, produto_codigo, quantidade,
    preco_tabela, desconto_percentual, preco_unitario)
  select v_id, i.produto_id, i.nome, i.codigo, i.quantidade, i.preco_tabela, i.desconto_percentual, i.preco_unitario
  from jsonb_to_recordset(v_calc->'itens') as i(produto_id uuid, nome text, codigo text, quantidade int,
    preco_tabela numeric, desconto_percentual numeric, preco_unitario numeric, valido boolean)
  where i.valido;

  delete from public.carrinho_itens where lojista_id = v_uid;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero);
end;
$$;

-- ===== Funções do admin =====
create function public.admin_atualizar_pedido(
  p_pedido_id uuid,
  p_status public.pedido_status default null,
  p_nota_id text default null,
  p_nota_url text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_atual public.pedido_status;
begin
  if not public.is_admin() then
    raise exception 'nao_autorizado';
  end if;

  select status into v_atual from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'pedido_nao_encontrado';
  end if;

  if p_nota_url is not null and p_nota_url <> '' and p_nota_url not like 'https://%' then
    raise exception 'url_invalida';
  end if;

  if p_status is not null and p_status <> v_atual then
    if not (
      (v_atual = 'aguardando_pagamento' and p_status in ('pago', 'cancelado'))
      or (v_atual = 'pago' and p_status in ('faturado', 'cancelado'))
      or (v_atual = 'faturado' and p_status = 'enviado')
      or (v_atual = 'enviado' and p_status = 'entregue')
      or (v_atual = 'entregue' and p_status = 'devolvido')
    ) then
      raise exception 'transicao_invalida';
    end if;

    update public.pedidos set status = p_status where id = p_pedido_id;
    insert into public.pedido_eventos (pedido_id, status_de, status_para, admin_id)
    values (p_pedido_id, v_atual, p_status, auth.uid());
  end if;

  if p_nota_id is not null then
    update public.pedidos set maino_nota_id = nullif(p_nota_id, '') where id = p_pedido_id;
  end if;
  if p_nota_url is not null then
    update public.pedidos set maino_nota_url = nullif(p_nota_url, '') where id = p_pedido_id;
  end if;
end;
$$;

-- Chamada pelo servidor depois de enviar os e-mails do pedido.
create function public.marcar_pedido_notificado(p_pedido_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.pedidos set notificado_em = now() where id = p_pedido_id;
$$;

-- ===== Grants =====
-- Supabase concede execute a anon/authenticated/service_role por default privileges: revogar explicitamente.
revoke execute on function public.calcular_impostos(char, public.indicador_ie, numeric)
  from public, anon, authenticated, service_role;
revoke execute on function public._itens_carrinho(uuid) from public, anon, authenticated, service_role;
revoke execute on function public._calcular_pedido(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.simular_pedido(text) from public, anon;
revoke execute on function public.criar_pedido(text, text) from public, anon;
revoke execute on function public.admin_atualizar_pedido(uuid, public.pedido_status, text, text) from public, anon;
revoke execute on function public.marcar_pedido_notificado(uuid) from public, anon, authenticated;

grant execute on function public.simular_pedido(text) to authenticated;
grant execute on function public.criar_pedido(text, text) to authenticated;
grant execute on function public.admin_atualizar_pedido(uuid, public.pedido_status, text, text) to authenticated;
grant execute on function public.marcar_pedido_notificado(uuid) to service_role;

