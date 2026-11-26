begin;
\ir _helpers.psql
select plan(25);

-- Pedidos: n1 pago (ACEITA fatura), n2 aguardando_pagamento, n3 pago (divergência), n4 pago (url/erro)
select gen_random_uuid() as n1, gen_random_uuid() as n2, gen_random_uuid() as n3, gen_random_uuid() as n4 \gset
insert into pedidos (id, lojista_id, status, cliente_tipo_pessoa, cliente_documento, cliente_nome,
  cliente_indicador_ie, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade,
  entrega_uf, subtotal, total)
select v.id::uuid, tests.id('l1'), v.s::public.pedido_status, 'PF', '11111111111', 'x', 'nao_contribuinte',
  '1', 'x', '1', 'x', 'x', 'PE', 1, 1
from (values (:'n1', 'pago'), (:'n2', 'aguardando_pagamento'), (:'n3', 'pago'), (:'n4', 'pago')) v(id, s);
select set_config('tests.n1', :'n1', true), set_config('tests.n2', :'n2', true),
       set_config('tests.n3', :'n3', true), set_config('tests.n4', :'n4', true);

-- ===== estrutura =====
select has_column('public', 'pedidos', 'maino_pedido_id', 'pedidos.maino_pedido_id existe');
select has_column('public', 'pedidos', 'nfe_status', 'pedidos.nfe_status existe');
select has_column('public', 'pedidos', 'nfe_erro', 'pedidos.nfe_erro existe');
select has_column('public', 'pedidos', 'nfe_atualizado_em', 'pedidos.nfe_atualizado_em existe');
select throws_ok(format($$update pedidos set nfe_status = 'XYZ' where id = %L$$, :'n1'),
  '23514', null, 'nfe_status inválido viola check');
select lives_ok(format($$update pedidos set nfe_status = 'ACEITA' where id = %L$$, :'n1'),
  'nfe_status válido é aceito');
select lives_ok(format($$update pedidos set nfe_status = null where id = %L$$, :'n1'),
  'nfe_status nulo é aceito');

-- ===== integracao_tokens =====
select has_table('public', 'integracao_tokens', 'integracao_tokens existe');
select ok(not has_table_privilege('authenticated', 'public.integracao_tokens', 'SELECT, INSERT, UPDATE, DELETE')
  and not has_table_privilege('anon', 'public.integracao_tokens', 'SELECT, INSERT, UPDATE, DELETE'),
  'integracao_tokens inacessível a authenticated e anon');
select ok((select relrowsecurity from pg_class where oid = 'public.integracao_tokens'::regclass),
  'integracao_tokens com RLS ligada');

-- ===== privilégios =====
select ok(not has_function_privilege('authenticated', 'public.sistema_registrar_nfe(uuid, text, text, text, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.sistema_registrar_nfe(uuid, text, text, text, text, text)', 'execute'),
  'sistema_registrar_nfe negada a authenticated/anon');
select ok(has_function_privilege('service_role', 'public.sistema_registrar_nfe(uuid, text, text, text, text, text)', 'execute'),
  'service_role executa sistema_registrar_nfe');
select tests.autenticar_como(tests.id('l1'));
select throws_ok(format($$select public.sistema_registrar_nfe(%L, null, 'ACEITA')$$, :'n1'),
  '42501', null, 'authenticated não chama sistema_registrar_nfe');
select tests.como_superuser();

-- ===== ACEITA em pedido pago =====
select is(public.sistema_registrar_nfe(tests.id('n1'), 'M-1', 'ACEITA', 'CHAVE123', 'https://x.test/danfe.pdf'),
  true, 'ACEITA em pedido pago retorna true');
select results_eq(format($$select status::text, maino_pedido_id, nfe_status, maino_nota_id, maino_nota_url, nfe_erro,
    nfe_atualizado_em is not null from pedidos where id = %L$$, :'n1'),
  $$values ('faturado', 'M-1', 'ACEITA', 'CHAVE123', 'https://x.test/danfe.pdf', null::text, true)$$,
  'pedido faturado com dados da NF-e gravados');
select results_eq(format($$select status_de::text, status_para::text, admin_id from pedido_eventos where pedido_id = %L$$, :'n1'),
  $$values ('pago', 'faturado', null::uuid)$$, 'um evento pago->faturado com admin_id nulo');
select is(public.sistema_registrar_nfe(tests.id('n1'), 'M-1', 'ACEITA', 'CHAVE123', 'https://x.test/danfe.pdf'),
  false, 'segunda chamada ACEITA retorna false');
select is((select count(*)::int from pedido_eventos where pedido_id = tests.id('n1')), 1,
  'continua com 1 evento');

-- ===== ACEITA em pedido aguardando pagamento =====
select is(public.sistema_registrar_nfe(tests.id('n2'), 'M-2', 'ACEITA', 'CH2', 'https://x.test/d2.pdf'),
  false, 'ACEITA em aguardando_pagamento retorna false');
select is((select status::text from pedidos where id = tests.id('n2')), 'aguardando_pagamento', 'status inalterado');

-- ===== validações =====
select public.sistema_registrar_nfe(tests.id('n3'), 'M-3', 'EM_TRANSMISSAO');
select throws_ok(format($$select public.sistema_registrar_nfe(%L, 'M-OUTRO')$$, :'n3'),
  null, 'maino_pedido_divergente', 'maino_pedido_id divergente falha');
select throws_ok(format($$select public.sistema_registrar_nfe(%L, null, 'ACEITA', 'C', 'http://x.test/d.pdf')$$, :'n4'),
  null, 'url_invalida', 'danfe http:// falha com url_invalida');
select throws_ok($$select public.sistema_registrar_nfe(gen_random_uuid(), null, 'ACEITA')$$,
  null, 'pedido_nao_encontrado', 'pedido inexistente falha');
select public.sistema_registrar_nfe(tests.id('n4'), null, 'REJEITADA', null, null, 'Erro SEFAZ');
select is((select nfe_erro from pedidos where id = tests.id('n4')), 'Erro SEFAZ', 'p_erro grava nfe_erro');
select public.sistema_registrar_nfe(tests.id('n4'), null, 'EM_TRANSMISSAO');
select is((select nfe_erro from pedidos where id = tests.id('n4')), null, 'p_erro nulo limpa nfe_erro');

select * from finish();
rollback;
