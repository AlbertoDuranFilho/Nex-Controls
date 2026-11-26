-- Catálogo v2: slug, EAN/CEST, checks fiscais, preços do cliente, carrinho_adicionar
-- e importação de produtos (planilha / formulário de admin).
-- Plano: docs/superpowers/plans/2026-11-25-fase2-4-catalogo-carrinho-pedido.md (Task 1)

create extension if not exists unaccent with schema extensions;

-- ===== Colunas e checks =====
alter table public.produtos
  add column slug text,
  add column ean text,
  add column cest char(7);

alter table public.produtos
  add constraint produtos_ean_check check (ean ~ '^(\d{8}|\d{12,14})$'),
  add constraint produtos_cest_check check (cest ~ '^\d{7}$'),
  add constraint produtos_ncm_check check (ncm ~ '^\d{8}$');

-- ===== Slug =====
-- Dicionário qualificado: a forma de 1 argumento depende do search_path.
create function public.gerar_slug(p_codigo text, p_nome text) returns text
language sql immutable parallel safe set search_path = '' as $$
  -- trim depois do corte: se o caractere 80 for '-', ele não fica na ponta.
  select trim(both '-' from left(
    regexp_replace(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary,
        coalesce(p_codigo, '') || ' ' || coalesce(p_nome, ''))),
      '[^a-z0-9]+', '-', 'g'),
    80));
$$;

-- Gera o slug quando vem nulo/vazio; em colisão com outra linha usa -2, -3...
-- Slug informado explicitamente não é alterado (a unique constraint decide).
-- security definer: a checagem de colisão precisa ver todas as linhas.
create function public.produtos_definir_slug() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  v_base := public.gerar_slug(new.codigo, new.nome);
  if v_base = '' then
    v_base := 'produto';
  end if;
  v_slug := v_base;

  while exists (select 1 from public.produtos p where p.slug = v_slug and p.id <> new.id) loop
    v_n := v_n + 1;
    v_slug := trim(trailing '-' from left(v_base, 80 - length('-' || v_n))) || '-' || v_n;
  end loop;

  new.slug := v_slug;
  return new;
end;
$$;

create trigger produtos_definir_slug
  before insert or update of codigo, nome, slug on public.produtos
  for each row execute function public.produtos_definir_slug();

-- Preenche as linhas existentes (o trigger gera o slug de cada uma).
update public.produtos set slug = null;

alter table public.produtos
  alter column slug set not null,
  add constraint produtos_slug_key unique (slug),
  add constraint produtos_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ===== Preços do cliente =====
-- security invoker: a RLS de produto_precos/lojistas/descontos vale para quem chama.
create function public.precos_cliente(p_produto_ids uuid[])
returns table (produto_id uuid, preco_tabela numeric, desconto_percentual numeric, preco_final numeric)
language sql stable security invoker set search_path = '' as $$
  with d as (
    select pp.produto_id, pp.preco,
           coalesce(ldp.desconto_percentual, l.desconto_percentual, 0) as pct
    from public.produto_precos pp
    join public.lojistas l on l.id = auth.uid() and l.ativo
    left join public.lojista_descontos_produto ldp
      on ldp.lojista_id = l.id and ldp.produto_id = pp.produto_id
    where pp.produto_id = any (p_produto_ids)
      and public.is_lojista_ativo()
  )
  select d.produto_id, d.preco, d.pct, round(d.preco * (1 - d.pct / 100), 2)
  from d;
$$;

-- ===== Carrinho =====
-- Item novo só para produto ativo (recria a policy da Fase 1).
drop policy carrinho_itens_proprio on public.carrinho_itens;
create policy carrinho_itens_proprio on public.carrinho_itens
  for all to authenticated
  using (lojista_id = auth.uid() and public.is_lojista_ativo())
  with check (
    lojista_id = auth.uid() and public.is_lojista_ativo()
    and exists (select 1 from public.produtos p where p.id = produto_id and p.ativo)
  );

create function public.carrinho_adicionar(p_produto_id uuid, p_quantidade int) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_quantidade int;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 9999 then
    raise exception 'quantidade_invalida';
  end if;

  insert into public.carrinho_itens as c (lojista_id, produto_id, quantidade)
  values (auth.uid(), p_produto_id, p_quantidade)
  on conflict (lojista_id, produto_id)
    do update set quantidade = least(9999, c.quantidade + excluded.quantidade)
  returning c.quantidade into v_quantidade;

  return v_quantidade;
end;
$$;

-- ===== Importação de produtos (admin) =====
-- Cada item: {id?, codigo, slug?, nome, preco, ativo, destaque, compatibilidade, descricao,
-- aplicacoes, ncm, cest, ean, origem, unidade, peso_kg, altura_cm, largura_cm, comprimento_cm,
-- manual_url, especificacoes:[{nome,valor}], imagens:[{url,alt}]}.
-- Com `id`: atualiza esse produto (permite trocar o código). Sem `id`: upsert por `codigo`.
-- Slug nulo/vazio: gerado no insert, mantido no update.
-- A função inteira roda numa transação só: qualquer erro desfaz a importação toda.
create function public.admin_importar_produtos(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_id uuid;
  r public.produtos%rowtype;
  v_criados int := 0;
  v_atualizados int := 0;
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

    if v_id is null then
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
        manual_url = r.manual_url
      where id = v_id;
      v_atualizados := v_atualizados + 1;
    end if;

    delete from public.produto_especificacoes where produto_id = v_id;
    insert into public.produto_especificacoes (produto_id, nome, valor, ordem)
    select v_id, e.value->>'nome', e.value->>'valor', (e.ordinality - 1)::int
    from jsonb_array_elements(coalesce(v_item->'especificacoes', '[]'::jsonb)) with ordinality as e(value, ordinality);

    delete from public.produto_imagens where produto_id = v_id;
    insert into public.produto_imagens (produto_id, url, alt, ordem)
    select v_id, i.value->>'url', nullif(i.value->>'alt', ''), (i.ordinality - 1)::int
    from jsonb_array_elements(coalesce(v_item->'imagens', '[]'::jsonb)) with ordinality as i(value, ordinality);

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

-- ===== Grants =====
-- Supabase concede execute a anon/authenticated por default privileges: revogar explicitamente.
revoke execute on function public.gerar_slug(text, text) from public, anon;
revoke execute on function public.produtos_definir_slug() from public, anon, authenticated;
revoke execute on function public.precos_cliente(uuid[]) from public, anon;
revoke execute on function public.carrinho_adicionar(uuid, int) from public, anon;
revoke execute on function public.admin_importar_produtos(jsonb) from public, anon;

grant execute on function public.gerar_slug(text, text) to authenticated;
grant execute on function public.precos_cliente(uuid[]) to authenticated;
grant execute on function public.carrinho_adicionar(uuid, int) to authenticated;
grant execute on function public.admin_importar_produtos(jsonb) to authenticated;
