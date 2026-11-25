begin;
\ir _helpers.psql
select plan(20);

select has_table('public', 'lojistas');
select has_table('public', 'profiles');
select has_table('public', 'acessos_log');

-- visitante
select tests.anonimo();
select is_empty($$select * from lojistas$$, 'anon não lê lojistas');
select is_empty($$select * from profiles$$, 'anon não lê profiles');

-- lojista L1
select tests.autenticar_como(tests.id('l1'));
select results_eq($$select id from lojistas$$, array[tests.id('l1')::uuid], 'L1 só vê a si');
select results_eq($$select id from profiles$$, array[tests.id('l1')::uuid], 'L1 só vê o próprio profile');
select is_empty($$with u as (update lojistas set telefone = '1' where id = tests.id('l2') returning id) select * from u$$,
  'L1 não altera L2');
select throws_ok($$update lojistas set desconto_percentual = 50 where id = tests.id('l1')$$, '42501', null,
  'L1 não altera desconto');
select throws_ok($$update lojistas set documento = '00000000000' where id = tests.id('l1')$$, '42501', null,
  'L1 não altera documento');
select throws_ok($$update profiles set is_admin = true where id = tests.id('l1')$$, '42501', null,
  'L1 não se promove a admin');
select lives_ok($$update lojistas set telefone = '81999999999', cep = '50000000' where id = tests.id('l1')$$,
  'L1 edita colunas permitidas');
select throws_ok($$insert into lojistas(id, tipo_pessoa, documento, nome, email)
  values (gen_random_uuid(), 'PF', '11111111112', 'x', 'x@x')$$, '42501', null, 'L1 não insere lojista');
select is_empty($$select * from acessos_log$$, 'lojista não lê acessos_log');
select ok(public.is_lojista_ativo(), 'L1 ativo');

-- lojista desativado
select tests.autenticar_como(tests.id('l3'));
select ok(not public.is_lojista_ativo(), 'L3 desativado');

-- admin
select tests.autenticar_como(tests.id('a'));
select results_eq($$select count(*)::int from lojistas$$, array[3], 'admin vê todos');

-- constraints e triggers (precisam de superusuário: auth.users)
select tests.como_superuser();
select throws_ok($$insert into lojistas(id, tipo_pessoa, documento, nome, email)
  values (tests.criar_usuario('z@z'), 'PF', '123', 'x', 'z@z')$$, '23514', null, 'CPF com tamanho errado');
select lives_ok($$update auth.users set email = 'novo@l1.com' where id = tests.id('l1')$$);
select is((select email from lojistas where id = :'l1'), 'novo@l1.com', 'trigger copia e-mail para lojistas');

select * from finish();
rollback;
