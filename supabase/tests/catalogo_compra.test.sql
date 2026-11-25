begin;
\ir _helpers.psql
select plan(36);

-- ===== cenário (superusuário): P ativo com preço 100, Q inativo, cupom C =====
select gen_random_uuid() as p, gen_random_uuid() as q, gen_random_uuid() as c \gset
insert into produtos (id, nome, codigo, ativo) values
  (:'p', 'Produto P', 'P1', true),
  (:'q', 'Produto Q', 'Q1', false);
insert into produto_precos (produto_id, preco) values (:'p', 100), (:'q', 50);
insert into produto_imagens (produto_id, url) values (:'p', 'http://x/p.png'), (:'q', 'http://x/q.png');
insert into produto_especificacoes (produto_id, nome, valor) values (:'p', 'Tensao', '12V'), (:'q', 'Tensao', '24V');
insert into cupons (id, codigo, tipo, valor) values (:'c', 'PROMO10', 'percentual', 10);
insert into lojista_descontos_produto (lojista_id, produto_id, desconto_percentual) values
  (tests.id('l1'), :'p', 5), (tests.id('l2'), :'p', 7);
insert into carrinho_itens (lojista_id, produto_id, quantidade) values (tests.id('l2'), :'p', 3);
insert into pedidos (lojista_id, cliente_tipo_pessoa, cliente_documento, cliente_nome, cliente_indicador_ie,
  entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf, subtotal, total)
select l, 'PF', '11111111111', 'x', 'nao_contribuinte', '1', 'x', '1', 'x', 'x', 'PE', 1, 1
from unnest(array[tests.id('l1'), tests.id('l2')]) l;
insert into pedido_itens (pedido_id, produto_id, produto_nome, produto_codigo, quantidade, preco_tabela, preco_unitario)
select id, :'p', 'Produto P', 'P1', 1, 100, 100 from pedidos;
select set_config('tests.p', :'p', true), set_config('tests.q', :'q', true), set_config('tests.c', :'c', true);

-- ===== estrutura e privilégios =====
select is((select count(*)::int from pg_tables where schemaname = 'public' and tablename in
  ('produtos','produto_imagens','produto_especificacoes','produto_precos','lojista_descontos_produto',
   'cupons','aliquotas_icms_uf','carrinho_itens','pedidos','pedido_itens')), 10, '10 tabelas criadas');
select ok(not exists (select 1 from unnest(array['produtos','produto_imagens','produto_especificacoes','produto_precos',
  'lojista_descontos_produto','cupons','aliquotas_icms_uf','carrinho_itens','pedidos','pedido_itens']) t
  where has_table_privilege('anon', 'public.' || t, 'TRUNCATE, TRIGGER, REFERENCES')
     or has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE, TRIGGER, REFERENCES')),
  'ninguém tem TRUNCATE/TRIGGER/REFERENCES');
select ok(has_table_privilege('anon', 'public.produtos', 'SELECT')
  and has_table_privilege('anon', 'public.produto_imagens', 'SELECT')
  and has_table_privilege('anon', 'public.produto_especificacoes', 'SELECT'), 'anon lê o catálogo público');
select ok(not exists (select 1 from unnest(array['produto_precos','lojista_descontos_produto','cupons',
  'aliquotas_icms_uf','carrinho_itens','pedidos','pedido_itens']) t
  where has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')),
  'anon sem acesso às demais tabelas');
select ok(not exists (select 1 from unnest(array['produtos','produto_imagens','produto_especificacoes']) t
  where has_table_privilege('anon', 'public.' || t, 'INSERT, UPDATE, DELETE')), 'anon não escreve no catálogo');
select ok(not has_table_privilege('authenticated', 'public.pedidos', 'INSERT, UPDATE, DELETE')
  and not has_table_privilege('authenticated', 'public.pedido_itens', 'INSERT, UPDATE, DELETE'),
  'authenticated não escreve em pedidos/pedido_itens');

-- ===== visitante =====
select tests.anonimo();
select results_eq($$select id from produtos$$, array[tests.id('p')], 'anon vê só produtos ativos');
select results_eq($$select produto_id from produto_imagens$$, array[tests.id('p')], 'anon vê só imagens de ativos');
select results_eq($$select produto_id from produto_especificacoes$$, array[tests.id('p')], 'anon vê só specs de ativos');
select throws_ok($$select * from produto_precos$$, '42501', null, 'anon não lê preço');
select throws_ok($$select * from cupons$$, '42501', null, 'anon não lê cupons');
select throws_ok($$select * from pedidos$$, '42501', null, 'anon não lê pedidos');

-- ===== lojista L1 (ativo) =====
select tests.autenticar_como(tests.id('l1'));
select results_eq($$select preco from produto_precos where produto_id = tests.id('p')$$, array[100.00::numeric],
  'lojista ativo vê preço');
select results_eq($$select id from produtos$$, array[tests.id('p')], 'lojista vê só produtos ativos');
select is_empty($$select * from cupons$$, 'lojista não lista cupons');
select results_eq($$select desconto_percentual from lojista_descontos_produto$$, array[5.00::numeric],
  'lojista vê só o próprio desconto');
select is_empty($$select * from lojista_descontos_produto where lojista_id = tests.id('l2')$$, 'não vê desconto de outro');
select is((select aliquota_interna from aliquotas_icms_uf where uf = 'PE'), 20.50::numeric, 'lojista lê alíquota PE');
select throws_ok($$insert into aliquotas_icms_uf values ('SP', 18, null)$$, '42501', null, 'lojista não escreve alíquota');
select lives_ok($$insert into carrinho_itens (lojista_id, produto_id, quantidade) values (tests.id('l1'), tests.id('p'), 2)$$,
  'lojista insere no próprio carrinho');
select throws_ok($$insert into carrinho_itens (lojista_id, produto_id, quantidade) values (tests.id('l2'), tests.id('q'), 1)$$,
  '42501', null, 'lojista não insere no carrinho de outro');
select results_eq($$select lojista_id from carrinho_itens$$, array[tests.id('l1')], 'lojista vê só o próprio carrinho');
select is_empty($$with d as (delete from carrinho_itens where lojista_id = tests.id('l2') returning 1) select * from d$$,
  'lojista não apaga carrinho de outro');
select results_eq($$select lojista_id from pedidos$$, array[tests.id('l1')], 'lojista vê só os próprios pedidos');
select results_eq($$select count(*)::int from pedido_itens$$, array[1], 'lojista vê só os próprios itens de pedido');
select throws_ok($$insert into pedidos(lojista_id, cliente_tipo_pessoa, cliente_documento, cliente_nome, cliente_indicador_ie,
  entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf, subtotal, total)
  values (tests.id('l1'),'PF','1','x','nao_contribuinte','1','x','1','x','x','PE',1,1)$$, '42501', null,
  'pedido só via função (fase 4)');
select throws_ok($$insert into produtos(nome, codigo) values ('x', 'x')$$, '42501', null, 'lojista não cria produto');
select is_empty($$with u as (update produto_precos set preco = 1 returning 1) select * from u$$, 'lojista não altera preço');

-- ===== lojista L3 (desativado) =====
select tests.autenticar_como(tests.id('l3'));
select is_empty($$select * from produto_precos$$, 'desativado não vê preço');
select is_empty($$select * from carrinho_itens$$, 'desativado não vê carrinho');
select throws_ok($$insert into carrinho_itens (lojista_id, produto_id, quantidade) values (tests.id('l3'), tests.id('p'), 1)$$,
  '42501', null, 'desativado não compra');

-- ===== admin =====
select tests.autenticar_como(tests.id('a'));
select lives_ok($$insert into produtos(nome, codigo) values ('Novo', 'N1')$$, 'admin cria produto');
select results_eq($$select count(*)::int from produtos$$, array[3], 'admin vê produtos inativos também');
select results_eq($$select count(*)::int from pedidos$$, array[2], 'admin lê todos os pedidos');
select results_eq($$select count(*)::int from cupons$$, array[1], 'admin lê cupons');

-- ===== cron (superusuário) =====
select tests.como_superuser();
select isnt_empty($$select 1 from cron.job where jobname = 'limpa_acessos_log'$$, 'job de limpeza de acessos_log agendado');

select * from finish();
rollback;
