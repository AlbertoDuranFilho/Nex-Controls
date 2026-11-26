-- Correções da revisão final das fases 2–4:
-- limites de quantidade no banco, cupom percentual até 100%, valor mínimo no erro de cupom
-- do criar_pedido e flags "manter" na importação por planilha (reimportação não apaga dados).

-- ===== Quantidade 1–9999 (o carrinho aceita PATCH direto pelo PostgREST) =====
alter table public.carrinho_itens
  add constraint carrinho_itens_quantidade_limite check (quantidade between 1 and 9999);
alter table public.pedido_itens
  add constraint pedido_itens_quantidade_limite check (quantidade <= 9999);

-- ===== Cupom percentual no máximo 100% (senão o total fica negativo) =====
alter table public.cupons
  add constraint cupons_percentual_max check (tipo <> 'percentual' or valor <= 100);

-- ===== criar_pedido: cupom_invalido devolve também valor_minimo =====
create or replace function public.criar_pedido(p_cupom text default null, p_observacao text default null) returns jsonb
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
    return jsonb_build_object('ok', false, 'erro', 'cupom_invalido', 'motivo', v_calc->'cupom'->>'motivo',
      'valor_minimo', v_calc->'cupom'->'valor_minimo');
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

-- ===== Importação: flags "manter" (só a planilha usa; o formulário do admin substitui tudo) =====
-- manter_especificacoes: não mexe nas especificações (planilha sem a aba Especificacoes).
-- manter_imagens: não mexe nas imagens (sem a aba Imagens, ou só arquivos pendentes para o código).
-- manter_manual: mantém manual_url (célula do manual vazia ou com arquivo pendente).
-- Ausentes valem false. No insert não há nada a manter: grava o que veio.
create or replace function public.admin_importar_produtos(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_id uuid;
  v_novo boolean;
  r public.produtos%rowtype;
  v_criados int := 0;
  v_atualizados int := 0;
  v_manter_esp boolean;
  v_manter_img boolean;
  v_manter_manual boolean;
begin
  if not public.is_admin() then
    raise exception 'nao_autorizado';
  end if;
  if p is null or jsonb_typeof(p) <> 'array' then
    raise exception 'entrada_invalida';
  end if;

  for v_item in select value from jsonb_array_elements(p) loop
    -- Normaliza o item uma vez só (strings vazias viram null).
    r := null;
    r.codigo := trim(v_item->>'codigo');
    r.slug := nullif(v_item->>'slug', '');
    r.nome := v_item->>'nome';
    r.ativo := (v_item->>'ativo')::boolean;   -- null: true no insert, mantém no update
    r.destaque := nullif(v_item->>'destaque', '');
    r.compatibilidade := nullif(v_item->>'compatibilidade', '');
    r.descricao := nullif(v_item->>'descricao', '');
    r.aplicacoes := nullif(v_item->>'aplicacoes', '');
    r.ncm := nullif(trim(v_item->>'ncm'), '');
    r.cest := nullif(trim(v_item->>'cest'), '');
    r.ean := nullif(trim(v_item->>'ean'), '');
    r.origem := nullif(v_item->>'origem', '')::smallint;
    r.unidade := coalesce(nullif(trim(v_item->>'unidade'), ''), 'UN');
    r.peso_kg := nullif(v_item->>'peso_kg', '')::numeric;
    r.altura_cm := nullif(v_item->>'altura_cm', '')::numeric;
    r.largura_cm := nullif(v_item->>'largura_cm', '')::numeric;
    r.comprimento_cm := nullif(v_item->>'comprimento_cm', '')::numeric;
    r.manual_url := nullif(v_item->>'manual_url', '');
    v_manter_esp := coalesce((v_item->>'manter_especificacoes')::boolean, false);
    v_manter_img := coalesce((v_item->>'manter_imagens')::boolean, false);
    v_manter_manual := coalesce((v_item->>'manter_manual')::boolean, false);

    -- Alvo: o id informado (permite trocar o código) ou o produto com esse código.
    v_id := nullif(v_item->>'id', '')::uuid;
    if v_id is not null then
      perform 1 from public.produtos where id = v_id for update;
      if not found then
        raise exception 'produto_nao_encontrado';
      end if;
    else
      select id into v_id from public.produtos where codigo = r.codigo for update;
    end if;

    v_novo := v_id is null;
    if v_novo then
      -- slug nulo: o trigger gera
      insert into public.produtos (codigo, slug, nome, ativo, destaque, compatibilidade, descricao,
        aplicacoes, ncm, cest, ean, origem, unidade, peso_kg, altura_cm, largura_cm, comprimento_cm, manual_url)
      values (r.codigo, r.slug, r.nome, coalesce(r.ativo, true), r.destaque, r.compatibilidade, r.descricao,
        r.aplicacoes, r.ncm, r.cest, r.ean, r.origem, r.unidade, r.peso_kg, r.altura_cm, r.largura_cm,
        r.comprimento_cm, r.manual_url)
      returning id into v_id;
      v_criados := v_criados + 1;
    else
      update public.produtos set
        codigo = r.codigo,
        slug = coalesce(r.slug, slug),   -- slug vazio mantém o atual
        nome = r.nome,
        ativo = coalesce(r.ativo, ativo),
        destaque = r.destaque,
        compatibilidade = r.compatibilidade,
        descricao = r.descricao,
        aplicacoes = r.aplicacoes,
        ncm = r.ncm,
        cest = r.cest,
        ean = r.ean,
        origem = r.origem,
        unidade = r.unidade,
        peso_kg = r.peso_kg,
        altura_cm = r.altura_cm,
        largura_cm = r.largura_cm,
        comprimento_cm = r.comprimento_cm,
        manual_url = case when v_manter_manual then manual_url else r.manual_url end
      where id = v_id;
      v_atualizados := v_atualizados + 1;
    end if;

    if v_novo or not v_manter_esp then
      delete from public.produto_especificacoes where produto_id = v_id;
      insert into public.produto_especificacoes (produto_id, nome, valor, ordem)
      select v_id, e.value->>'nome', e.value->>'valor', (e.ordinality - 1)::int
      from jsonb_array_elements(coalesce(v_item->'especificacoes', '[]'::jsonb)) with ordinality as e(value, ordinality);
    end if;

    if v_novo or not v_manter_img then
      delete from public.produto_imagens where produto_id = v_id;
      insert into public.produto_imagens (produto_id, url, alt, ordem)
      select v_id, i.value->>'url', nullif(i.value->>'alt', ''), (i.ordinality - 1)::int
      from jsonb_array_elements(coalesce(v_item->'imagens', '[]'::jsonb)) with ordinality as i(value, ordinality);
    end if;

    if v_item->>'preco' is null then
      delete from public.produto_precos where produto_id = v_id;
    else
      insert into public.produto_precos (produto_id, preco)
      values (v_id, (v_item->>'preco')::numeric)
      on conflict (produto_id) do update set preco = excluded.preco;
    end if;
  end loop;

  return jsonb_build_object('criados', v_criados, 'atualizados', v_atualizados);
end;
$$;

-- create or replace mantém os grants; reforça o padrão do projeto.
revoke execute on function public.criar_pedido(text, text) from public, anon;
revoke execute on function public.admin_importar_produtos(jsonb) from public, anon;
grant execute on function public.criar_pedido(text, text) to authenticated;
grant execute on function public.admin_importar_produtos(jsonb) to authenticated;
