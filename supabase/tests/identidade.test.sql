begin;
\ir _helpers.psql
select plan(28);

select has_table('public', 'lojistas', 'tabela lojistas existe');
select has_table('public', 'profiles', 'tabela profiles existe');
select has_table('public', 'acessos_log', 'tabela acessos_log existe');

-- privilégios de tabela (TRUNCATE ignora RLS; TRIGGER/REFERENCES não devem existir)
select ok(not has_table_privilege('anon', 'public.lojistas', 'TRUNCATE, TRIGGER, REFERENCES'), 'anon sem TRUNCATE/TRIGGER/REFERENCES em lojistas');
select ok(not has_table_privilege('authenticated', 'public.lojistas', 'TRUNCATE, TRIGGER, REFERENCES'), 'authenticated sem TRUNCATE/TRIGGER/REFERENCES em lojistas');
select ok(not has_table_privilege('anon', 'public.profiles', 'TRUNCATE, TRIGGER, REFERENCES'), 'anon sem TRUNCATE/TRIGGER/REFERENCES em profiles');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE, TRIGGER, REFERENCES'), 'authenticated sem TRUNCATE/TRIGGER/REFERENCES em profiles');

-- cenário de log (como superusuário)
insert into acessos_log (user_id, ip, user_agent) values (tests.id('l1'), '127.0.0.1', 'teste');

-- visitante
select tests.anonimo();
select throws_ok($$select * from lojistas$$, '42501', null, 'anon não lê lojistas');
select throws_ok($$select * from profiles$$, '42501', null, 'anon não lê profiles');
select throws_ok($$select * from acessos_log$$, '42501', null, 'anon não lê acessos_log');

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
select results_eq($$select count(*)::int from acessos_log$$, array[1], 'admin lê acessos_log');

-- constraints e triggers (precisam de superusuário: auth.users)
select tests.como_superuser();
select throws_ok($$insert into lojistas(id, tipo_pessoa, documento, nome, email)
  values (tests.criar_usuario('z@z'), 'PF', '123', 'x', 'z@z')$$, '23514', null, 'CPF com tamanho errado');
select throws_ok($$insert into lojistas(id, tipo_pessoa, documento, nome, email)
  values (tests.criar_usuario('d@d'), 'PF', '123.456.789', 'x', 'd@d')$$, '23514', null,
  'documento com pontuação (11 chars, não só dígitos) é rejeitado');
select throws_ok($$insert into lojistas(id, tipo_pessoa, documento, nome, email)
  values (tests.criar_usuario('n@n'), 'PF', null, 'x', 'n@n')$$, '23514', null,
  'documento nulo sem anonimização é rejeitado');
select lives_ok($$update auth.users set email = 'novo@l1.com' where id = tests.id('l1')$$);
select is((select email from lojistas where id = :'l1'), 'novo@l1.com', 'trigger copia e-mail para lojistas');

select * from finish();
rollback;
