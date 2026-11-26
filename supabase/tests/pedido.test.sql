begin;
\ir _helpers.psql
select plan(75);

-- ===== cenário (superusuário) =====
-- P1 preço 100, P2 preço 50, P3 ativo preço 10 (desativado depois), P4 sem preço.
-- l1: endereço completo, desconto geral 10%. l2: endereço completo, sem desconto.
-- l4: ativo e sem endereço. l3 (helper): desativado.
select gen_random_uuid() as p1, gen_random_uuid() as p2, gen_random_uuid() as p3, gen_random_uuid() as p4,
       gen_random_uuid() as c10p, gen_random_uuid() as clim, tests.criar_usuario('l4@loja.test') as l4 \gset
insert into produtos (id, nome, codigo, ativo) values
  (:'p1', 'Produto Um', 'PED-P1', true),
  (:'p2', 'Produto Dois', 'PED-P2', true),
  (:'p3', 'Produto Tres', 'PED-P3', true),
  (:'p4', 'Produto Quatro', 'PED-P4', true);
insert into produto_precos (produto_id, preco) values (:'p1', 100), (:'p2', 50), (:'p3', 10);

update lojistas set desconto_percentual = 10, cep = '50000000', logradouro = 'Rua A', numero = '1',
  bairro = 'Centro', cidade = 'Recife', uf = 'PE' where id = tests.id('l1');
update lojistas set cep = '01000000', logradouro = 'Rua B', numero = '2', complemento = 'Sala 3',
  bairro = 'Se', cidade = 'Sao Paulo', uf = 'SP', indicador_ie = 'contribuinte', inscricao_estadual = '123'
  where id = tests.id('l2');
insert into lojistas (id, tipo_pessoa, documento, nome, email, ativo, cep, logradouro)
values (:'l4', 'PF', '44444444444', 'Lojista Quatro', 'l4@loja.test', true, '50000000', ' ');

insert into cupons (id, codigo, tipo, valor, valor_minimo_pedido, valido_de, valido_ate, max_usos, lojista_id, ativo) values
  (:'c10p', 'C10P', 'percentual', 10, null, null, null, null, null, true),
  (gen_random_uuid(), 'C30V', 'valor', 30, null, null, null, null, null, true),
  (gen_random_uuid(), 'C500V', 'valor', 500, null, null, null, null, null, true),
  (gen_random_uuid(), 'CMIN', 'percentual', 5, 1000, null, null, null, null, true),
  (gen_random_uuid(), 'CEXP', 'percentual', 10, null, null, now() - interval '1 day', null, null, true),
  (gen_random_uuid(), 'CFUT', 'percentual', 10, null, now() + interval '1 day', null, null, null, true),
  (gen_random_uuid(), 'CINAT', 'percentual', 10, null, null, null, null, null, false),
  (:'clim', 'CLIM', 'valor', 50, null, null, null, 1, null, true),
  (gen_random_uuid(), 'CL2', 'percentual', 10, null, null, null, null, :'l2', true);

insert into carrinho_itens (lojista_id, produto_id, quantidade) values
  (tests.id('l1'), :'p1', 2), (tests.id('l2'), :'p1', 2), (:'l4', :'p2', 1), (tests.id('l3'), :'p1', 1);

select set_config('tests.p1', :'p1', true), set_config('tests.p2', :'p2', true),
       set_config('tests.p3', :'p3', true), set_config('tests.p4', :'p4', true),
       set_config('tests.c10p', :'c10p', true), set_config('tests.clim', :'clim', true),
       set_config('tests.l4', :'l4', true);

-- ===== estrutura e privilégios =====
select has_column('public', 'pedidos', 'observacao', 'pedidos.observacao existe');
select has_column('public', 'pedidos', 'notificado_em', 'pedidos.notificado_em existe');
select has_table('public', 'pedido_eventos', 'pedido_eventos existe');
select ok(not has_function_privilege('anon', 'public.criar_pedido(text, text)', 'execute'), 'anon não executa criar_pedido');
select ok(not has_function_privilege('anon', 'public.simular_pedido(text)', 'execute'), 'anon não executa simular_pedido');
select ok(has_function_privilege('authenticated', 'public.criar_pedido(text, text)', 'execute')
  and has_function_privilege('authenticated', 'public.simular_pedido(text)', 'execute'),
  'authenticated executa criar_pedido e simular_pedido');
select ok(not has_function_privilege('authenticated', 'public._calcular_pedido(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public._calcular_pedido(uuid, text)', 'execute')
  and not has_function_privilege('service_role', 'public._calcular_pedido(uuid, text)', 'execute'),
  '_calcular_pedido só para o owner');
select ok(not has_function_privilege('authenticated', 'public.marcar_pedido_notificado(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.marcar_pedido_notificado(uuid)', 'execute'),
  'marcar_pedido_notificado negado a authenticated/anon');
select ok(has_function_privilege('service_role', 'public.marcar_pedido_notificado(uuid)', 'execute'),
  'service_role executa marcar_pedido_notificado');
select ok(not has_table_privilege('authenticated', 'public.pedido_eventos', 'INSERT, UPDATE, DELETE, TRUNCATE')
  and not has_table_privilege('anon', 'public.pedido_eventos', 'SELECT, INSERT, UPDATE, DELETE'),
  'pedido_eventos sem escrita para authenticated e sem acesso para anon');
select ok(not has_column_privilege('authenticated', 'public.pedido_eventos', 'admin_id', 'SELECT'),
  'authenticated não lê pedido_eventos.admin_id');
select throws_ok($$insert into cupons (codigo, tipo, valor) values ('abc', 'percentual', 10)$$,
  '23514', null, 'cupom com código minúsculo viola check');
select throws_ok($$insert into cupons (codigo, tipo, valor) values (' ABC ', 'percentual', 10)$$,
  '23514', null, 'cupom com espaços no código viola check');
select is((select ok_ from (select icms = 0 and difal = 0 as ok_ from public.calcular_impostos('SP', 'contribuinte', 100)) t),
  true, 'calcular_impostos retorna (0, 0)');

-- ===== simulação: l1 =====
select tests.autenticar_como(tests.id('l1'));
select set_config('tests.r', public.simular_pedido()::text, true);
select results_eq($$select (r->>'subtotal')::numeric, (r->>'desconto_cliente')::numeric, r->>'desconto_origem',
    (r->>'total')::numeric, r->'cupom'->>'situacao', r->'cupom'->>'codigo', r->'bloqueios'
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values (200.00::numeric, 20.00::numeric, 'cliente', 180.00::numeric, 'ausente', null::text, '[]'::jsonb)$$,
  'l1 sem cupom: subtotal 200, desconto cliente 20, total 180');
select results_eq($$select r->>'total', r->>'frete', r->>'icms', r->>'difal', r->>'desconto_cupom', r->>'desconto_aplicado'
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values ('180.00', '0.00', '0.00', '0.00', '0.00', '20.00')$$, 'valores com 2 casas');
select results_eq($$select i->>'codigo', i->>'nome', (i->>'quantidade')::int, i->>'preco_tabela', i->>'desconto_percentual',
    i->>'preco_unitario', i->>'total_linha', (i->>'valido')::boolean, i->>'motivo'
  from jsonb_array_elements(current_setting('tests.r')::jsonb->'itens') i$$,
  $$values ('PED-P1', 'Produto Um', 2, '100.00', '10.00', '90.00', '180.00', true, null::text)$$,
  'item com desconto do cliente');
select is(public.simular_pedido('   ')->'cupom'->>'situacao', 'ausente', 'cupom em branco = ausente');

select set_config('tests.r', public.simular_pedido('C30V')::text, true);
select results_eq($$select (r->>'desconto_cupom')::numeric, r->'cupom'->>'situacao', r->'cupom'->>'codigo', r->>'desconto_origem',
    (r->>'desconto_aplicado')::numeric, (r->>'total')::numeric,
    (r->'itens'->0->>'desconto_percentual')::numeric, (r->'itens'->0->>'preco_unitario')::numeric,
    (r->'itens'->0->>'total_linha')::numeric
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values (30.00::numeric, 'aplicado', 'C30V', 'cupom', 30.00::numeric, 170.00::numeric, 0::numeric, 100.00::numeric, 200.00::numeric)$$,
  'C30V vence (30 > 20): total 170, itens sem desconto do cliente');

select set_config('tests.r', public.simular_pedido(' c10p ')::text, true);
select results_eq($$select (r->>'desconto_cupom')::numeric, r->'cupom'->>'situacao', r->'cupom'->>'codigo',
    r->>'desconto_origem', (r->>'total')::numeric, (r->'itens'->0->>'preco_unitario')::numeric
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values (20.00::numeric, 'pior', 'C10P', 'cliente', 180.00::numeric, 90.00::numeric)$$,
  'c10p minúsculo empata (20 = 20): pior, origem cliente');

select set_config('tests.r', public.simular_pedido('CMIN')::text, true);
select results_eq($$select r->'cupom'->>'situacao', r->'cupom'->>'motivo', (r->'cupom'->>'valor_minimo')::numeric,
    (r->>'total')::numeric, r->>'desconto_origem'
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values ('invalido', 'valor_minimo', 1000.00::numeric, 180.00::numeric, 'cliente')$$,
  'CMIN: valor_minimo 1000, cupom ignorado');
select is(public.simular_pedido('CEXP')->'cupom'->>'motivo', 'fora_validade', 'CEXP: fora_validade');
select is(public.simular_pedido('CFUT')->'cupom'->>'motivo', 'fora_validade', 'CFUT (ainda não vale): fora_validade');
select is(public.simular_pedido('CINAT')->'cupom'->>'motivo', 'inativo', 'CINAT: inativo');
select is(public.simular_pedido('NAOEXISTE')->'cupom', '{"codigo":"NAOEXISTE","situacao":"invalido","motivo":"inexistente","valor_minimo":null}'::jsonb,
  'NAOEXISTE: inexistente');
select is(public.simular_pedido('CL2')->'cupom'->>'motivo', 'inexistente', 'cupom de outro cliente: inexistente');

-- item inativo e item sem preço (inseridos como superusuário; P3 desativado depois)
select tests.como_superuser();
insert into carrinho_itens (lojista_id, produto_id, quantidade) values
  (tests.id('l1'), tests.id('p3'), 1), (tests.id('l1'), tests.id('p4'), 1);
update produtos set ativo = false where id = tests.id('p3');
select tests.autenticar_como(tests.id('l1'));
select set_config('tests.r', public.simular_pedido()::text, true);
select results_eq($$select (i->>'valido')::boolean, i->>'motivo' from jsonb_array_elements(current_setting('tests.r')::jsonb->'itens') i
  where i->>'produto_id' = tests.id('p3')::text$$,
  $$values (false, 'inativo')$$, 'item inativo: valido false, motivo inativo');
select results_eq($$select (i->>'valido')::boolean, i->>'motivo' from jsonb_array_elements(current_setting('tests.r')::jsonb->'itens') i
  where i->>'produto_id' = tests.id('p4')::text$$,
  $$values (false, 'sem_preco')$$, 'item sem preço: valido false, motivo sem_preco');
select results_eq($$select (r->>'subtotal')::numeric, (r->>'total')::numeric, r->'bloqueios', jsonb_array_length(r->'itens')
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values (200.00::numeric, 180.00::numeric, '["itens_invalidos"]'::jsonb, 3)$$,
  'itens inválidos fora do subtotal; bloqueio itens_invalidos');
select is(public.criar_pedido(), '{"ok":false,"erro":"itens_invalidos"}'::jsonb, 'criar_pedido com item inválido: itens_invalidos');
select tests.como_superuser();
delete from carrinho_itens where lojista_id = tests.id('l1') and produto_id in (tests.id('p3'), tests.id('p4'));

-- ===== simulação: l2, l4, l3, admin =====
select tests.autenticar_como(tests.id('l2'));
select results_eq($$select r->'cupom'->>'situacao', (r->>'desconto_cupom')::numeric, (r->>'total')::numeric, r->>'desconto_origem'
  from (select public.simular_pedido('C10P') r) t$$,
  $$values ('aplicado', 20.00::numeric, 180.00::numeric, 'cupom')$$, 'l2 com C10P: aplicado, total 180');
select results_eq($$select (r->>'desconto_cupom')::numeric, r->>'total' from (select public.simular_pedido('C500V') r) t$$,
  $$values (200.00::numeric, '0.00')$$, 'cupom de 500 em carrinho de 200: desconto 200, total 0.00');
select is(public.simular_pedido('CL2')->'cupom'->>'situacao', 'aplicado', 'CL2 vale para l2');

select tests.autenticar_como(tests.id('l4'));
select is(public.simular_pedido()->'bloqueios', '["sem_endereco"]'::jsonb, 'l4 sem endereço: sem_endereco');
select is(public.criar_pedido(), '{"ok":false,"erro":"sem_endereco"}'::jsonb, 'criar_pedido de l4: sem_endereco');

select tests.autenticar_como(tests.id('l3'));
select is(public.simular_pedido()->'bloqueios'->>0, 'conta_inativa', 'l3 desativado: conta_inativa');
select is(public.criar_pedido(), '{"ok":false,"erro":"conta_inativa"}'::jsonb, 'criar_pedido de l3: conta_inativa');

select tests.autenticar_como(tests.id('a'));
select is(public.criar_pedido()->>'erro', 'conta_inativa', 'admin sem cadastro de lojista: conta_inativa');

-- ===== criar_pedido =====
select tests.autenticar_como(tests.id('l2'));
select set_config('tests.r', public.criar_pedido('C10P', '  Entregar pela manhã  ')::text, true);
select set_config('tests.ped1', current_setting('tests.r')::jsonb->>'id', true);
select results_eq($$select (r->>'ok')::boolean, r->>'id' is not null, (r->>'numero')::bigint > 0
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values (true, true, true)$$, 'criar_pedido de l2 com C10P: ok, id e número');
select results_eq($$select cupom_id, desconto_origem::text, desconto_valor, subtotal, total, status::text, gateway_provider, observacao
  from pedidos where id = tests.id('ped1')$$,
  $$values (tests.id('c10p'), 'cupom', 20.00::numeric, 200.00::numeric, 180.00::numeric, 'aguardando_pagamento', 'manual', 'Entregar pela manhã')$$,
  'pedido de l2: cupom, valores, status, gateway e observação com trim');
select results_eq($$select cliente_tipo_pessoa::text, cliente_documento, cliente_nome, cliente_indicador_ie::text, cliente_inscricao_estadual,
    entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf::text
  from pedidos where id = tests.id('ped1')$$,
  $$values ('PJ', '22222222222222', 'Lojista Dois', 'contribuinte', '123', '01000000', 'Rua B', '2', 'Sala 3', 'Se', 'Sao Paulo', 'SP')$$,
  'snapshot do cadastro de l2');
select results_eq($$select produto_id, produto_codigo, produto_nome, quantidade, preco_tabela, desconto_percentual, preco_unitario
  from pedido_itens where pedido_id = tests.id('ped1')$$,
  $$values (tests.id('p1'), 'PED-P1', 'Produto Um', 2, 100.00::numeric, 0::numeric, 100.00::numeric)$$,
  'itens do pedido de l2');
select is((select count(*)::int from carrinho_itens where lojista_id = tests.id('l2')), 0, 'carrinho de l2 esvaziado');
select is(public.criar_pedido('C10P'), '{"ok":false,"erro":"carrinho_vazio"}'::jsonb, 'segunda chamada imediata: carrinho_vazio');
select is(public.simular_pedido()->'bloqueios', '["carrinho_vazio"]'::jsonb, 'simular com carrinho vazio: carrinho_vazio');
select is((select count(*)::int from pedidos where lojista_id = tests.id('l2')), 1, 'só um pedido criado para l2');

select is(public.carrinho_adicionar(tests.id('p1'), 2), 2, 'l2 monta novo carrinho');
select is(public.simular_pedido('C10P')->'cupom'->>'motivo', 'ja_usado', 'C10P já usado por l2 (simulação)');
select is(public.criar_pedido('C10P'), '{"ok":false,"erro":"cupom_invalido","motivo":"ja_usado","valor_minimo":null}'::jsonb,
  'C10P de novo por l2: cupom_invalido/ja_usado');
select is((select count(*)::int from carrinho_itens where lojista_id = tests.id('l2')), 1, 'pedido recusado não mexe no carrinho');

-- CLIM (max_usos 1)
select set_config('tests.r', public.criar_pedido('CLIM')::text, true);
select set_config('tests.ped2', current_setting('tests.r')::jsonb->>'id', true);
select is((current_setting('tests.r')::jsonb->>'ok')::boolean, true, 'CLIM usado por l2: ok');

select tests.autenticar_como(tests.id('l1'));
select is(public.criar_pedido('CLIM'), '{"ok":false,"erro":"cupom_invalido","motivo":"esgotado","valor_minimo":null}'::jsonb,
  'CLIM por l1: cupom_invalido/esgotado');
select tests.autenticar_como(tests.id('a'));
select lives_ok($$select public.admin_atualizar_pedido(tests.id('ped2'), 'cancelado')$$, 'admin cancela pedido de l2');
select tests.autenticar_como(tests.id('l1'));
select set_config('tests.r', public.criar_pedido('CLIM')::text, true);
select set_config('tests.ped3', current_setting('tests.r')::jsonb->>'id', true);
select is((current_setting('tests.r')::jsonb->>'ok')::boolean, true, 'CLIM liberado após cancelamento: l1 consegue');
select results_eq($$select cupom_id, desconto_origem::text, total from pedidos where id = tests.id('ped3')$$,
  $$values (tests.id('clim'), 'cupom', 150.00::numeric)$$, 'pedido de l1 com CLIM: cupom_id e total 150');

-- C10P pior para l1 → cupom_id null
select is(public.carrinho_adicionar(tests.id('p1'), 2), 2, 'l1 monta novo carrinho');
select set_config('tests.r', public.criar_pedido('C10P', '   ')::text, true);
select set_config('tests.ped4', current_setting('tests.r')::jsonb->>'id', true);
select results_eq($$select cupom_id, desconto_origem::text, desconto_valor, total, observacao from pedidos where id = tests.id('ped4')$$,
  $$values (null::uuid, 'cliente', 20.00::numeric, 180.00::numeric, null::text)$$,
  'C10P pior: cupom_id null, origem cliente, observação vazia vira null');
select results_eq($$select desconto_percentual, preco_unitario from pedido_itens where pedido_id = tests.id('ped4')$$,
  $$values (10.00::numeric, 90.00::numeric)$$, 'itens com desconto do cliente');

-- observação longa
select is(public.carrinho_adicionar(tests.id('p2'), 1), 1, 'l1 monta outro carrinho');
select is(public.criar_pedido(null, repeat('a', 501)), '{"ok":false,"erro":"observacao_longa"}'::jsonb,
  'observação com 501 caracteres: observacao_longa');
select is((public.criar_pedido(null, repeat('a', 500))->>'ok')::boolean, true, 'observação com 500 caracteres: ok');

-- ===== admin_atualizar_pedido =====
select throws_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), 'pago')$$, 'P0001', 'nao_autorizado',
  'lojista não atualiza pedido');
select tests.autenticar_como(tests.id('a'));
select throws_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), 'entregue')$$, 'P0001', 'transicao_invalida',
  'aguardando_pagamento→entregue: transicao_invalida');
select throws_ok($$select public.admin_atualizar_pedido(tests.id('ped2'), 'pago')$$, 'P0001', 'transicao_invalida',
  'cancelado→pago: transicao_invalida');
select lives_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), 'pago')$$, 'aguardando_pagamento→pago');
select throws_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), null, null, 'http://x')$$, 'P0001', 'url_invalida',
  'nota_url http://: url_invalida');
select lives_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), 'pago', 'NF-1', 'https://nota/1')$$,
  'mesmo status + nota: ok');
select tests.como_superuser();
select results_eq($$select status::text, maino_nota_id, maino_nota_url from pedidos where id = tests.id('ped4')$$,
  $$values ('pago', 'NF-1', 'https://nota/1')$$, 'status e nota gravados');
select results_eq($$select status_de::text, status_para::text, admin_id from pedido_eventos where pedido_id = tests.id('ped4')$$,
  $$values ('aguardando_pagamento', 'pago', tests.id('a'))$$, 'um evento com admin_id (mesmo status não gera evento)');
select tests.autenticar_como(tests.id('a'));
select lives_ok($$select public.admin_atualizar_pedido(tests.id('ped4'), null, '', '')$$, 'nota vazia');
select tests.como_superuser();
select results_eq($$select maino_nota_id, maino_nota_url from pedidos where id = tests.id('ped4')$$,
  $$values (null::text, null::text)$$, 'string vazia vira null');

-- ===== RLS de pedidos e eventos =====
select tests.autenticar_como(tests.id('l1'));
select is((select count(*)::int from pedidos where id in (tests.id('ped1'), tests.id('ped2'))), 0, 'l1 não lê pedidos de l2');
select is((select count(*)::int from pedido_eventos where pedido_id in (tests.id('ped2'), tests.id('ped4'))), 1,
  'l1 lê só os eventos do próprio pedido');
select throws_ok($$select admin_id from pedido_eventos$$, '42501', null, 'l1: select admin_id dá 42501');

-- ===== marcar_pedido_notificado =====
select tests.como_superuser();
select public.marcar_pedido_notificado(tests.id('ped4'));
select isnt((select notificado_em from pedidos where id = tests.id('ped4')), null, 'marcar_pedido_notificado grava notificado_em');

select * from finish();
rollback;
