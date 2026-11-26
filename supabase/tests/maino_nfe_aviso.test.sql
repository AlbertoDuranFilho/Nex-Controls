begin;
\ir _helpers.psql
select plan(9);

-- a1: pago, ACEITA sem DANFE e depois com DANFE. a2: pago, ACEITA já com DANFE.
-- a3: aguardando_pagamento. a4: CANCELADA.
select gen_random_uuid() as a1, gen_random_uuid() as a2, gen_random_uuid() as a3, gen_random_uuid() as a4 \gset
insert into pedidos (id, lojista_id, status, cliente_tipo_pessoa, cliente_documento, cliente_nome,
  cliente_indicador_ie, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade,
  entrega_uf, subtotal, total)
select v.id::uuid, tests.id('l1'), v.s::public.pedido_status, 'PF', '11111111111', 'x', 'nao_contribuinte',
  '1', 'x', '1', 'x', 'x', 'PE', 1, 1
from (values (:'a1', 'pago'), (:'a2', 'pago'), (:'a3', 'aguardando_pagamento'), (:'a4', 'pago')) v(id, s);

-- ===== ACEITA sem DANFE: fatura, mas não avisa (não há link) =====
select is(public.sistema_registrar_nfe(:'a1', 'M-1', 'ACEITA', 'CH1', null), false,
  'ACEITA sem DANFE fatura e retorna false');
select is((select status::text from pedidos where id = :'a1'), 'faturado', 'pedido faturado mesmo sem DANFE');
select is(public.sistema_registrar_nfe(:'a1', 'M-1', 'ACEITA', 'CH1', 'https://x.test/d1.pdf'), true,
  'DANFE que chega depois do faturamento retorna true (avisar)');
select is(public.sistema_registrar_nfe(:'a1', 'M-1', 'ACEITA', 'CH1', 'https://x.test/d1.pdf'), false,
  'consulta seguinte não avisa de novo');
select is((select count(*)::int from pedido_eventos where pedido_id = :'a1'), 1, 'um único evento de faturamento');

-- ===== ACEITA com DANFE na mesma chamada =====
select is(public.sistema_registrar_nfe(:'a2', 'M-2', 'ACEITA', 'CH2', 'https://x.test/d2.pdf'), true,
  'faturou com DANFE retorna true');

-- ===== pedido não pago =====
select is(public.sistema_registrar_nfe(:'a3', 'M-3', 'ACEITA', 'CH3', 'https://x.test/d3.pdf'), false,
  'aguardando_pagamento não avisa');

-- ===== nota cancelada =====
select public.sistema_registrar_nfe(:'a4', 'M-4', 'ACEITA', 'CH4', null);
select is(public.sistema_registrar_nfe(:'a4', 'M-4', 'CANCELADA', 'CH4', 'https://x.test/d4.pdf'), false,
  'DANFE de nota cancelada não avisa');
select is(public.sistema_registrar_nfe(:'a4', 'M-4', 'EM_TRANSMISSAO'), false, 'sem ACEITA não avisa');

select * from finish();
rollback;
