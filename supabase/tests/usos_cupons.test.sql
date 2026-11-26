begin;
\ir _helpers.psql
select plan(5);

-- Cupom A: 2 pedidos ativos + 1 cancelado (conta 2). Cupom B: só 1 cancelado (não aparece).
select gen_random_uuid() as ca, gen_random_uuid() as cb \gset
insert into cupons (id, codigo, tipo, valor) values
  (:'ca', 'USOSA', 'percentual', 10), (:'cb', 'USOSB', 'percentual', 10);

insert into pedidos (lojista_id, status, cupom_id, cliente_tipo_pessoa, cliente_documento, cliente_nome,
  cliente_indicador_ie, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade,
  entrega_uf, subtotal, total)
select tests.id('l1'), s::public.pedido_status, c::uuid, 'PF', '11111111111', 'x', 'nao_contribuinte',
  '1', 'x', '1', 'x', 'x', 'PE', 1, 1
from (values ('aguardando_pagamento', :'ca'), ('pago', :'ca'), ('cancelado', :'ca'), ('cancelado', :'cb')) v(s, c);

select results_eq(
  format($$select usos from public.admin_usos_cupons() where cupom_id = %L$$, :'ca'),
  $$values (2::bigint)$$,
  'usos exclui pedidos cancelados');
select is_empty(
  format($$select 1 from public.admin_usos_cupons() where cupom_id = %L$$, :'cb'),
  'cupom só com pedido cancelado não tem uso');

select ok(not has_function_privilege('anon', 'public.admin_usos_cupons()', 'execute'), 'anon não executa');
select ok(not has_function_privilege('authenticated', 'public.admin_usos_cupons()', 'execute'), 'authenticated não executa');
select ok(has_function_privilege('service_role', 'public.admin_usos_cupons()', 'execute'), 'service_role executa');

select * from finish();
rollback;
