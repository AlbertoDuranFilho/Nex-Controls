begin;
\ir _helpers.psql
select plan(46);

select has_table('public', 'lojistas', 'tabela lojistas existe');
select has_table('public', 'profiles', 'tabela profiles existe');
select has_table('public', 'acessos_log', 'tabela acessos_log existe');

-- privilégios de tabela (TRUNCATE ignora RLS; TRIGGER/REFERENCES não devem existir)
select ok(not has_table_privilege('anon', 'public.lojistas', 'TRUNCATE, TRIGGER, REFERENCES'), 'anon sem TRUNCATE/TRIGGER/REFERENCES em lojistas');
select ok(not has_table_privilege('authenticated', 'public.lojistas', 'TRUNCATE, TRIGGER, REFERENCES'), 'authenticated sem TRUNCATE/TRIGGER/REFERENCES em lojistas');
select ok(not has_table_privilege('anon', 'public.profiles', 'TRUNCATE, TRIGGER, REFERENCES'), 'anon sem TRUNCATE/TRIGGER/REFERENCES em profiles');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE, TRIGGER, REFERENCES'), 'authenticated sem TRUNCATE/TRIGGER/REFERENCES em profiles');

select ok(not exists (select 1 from unnest(array['anon','authenticated']) r, unnest(array['USAGE','SELECT','UPDATE']) pr
  where has_sequence_privilege(r, 'public.acessos_log_id_seq', pr)), 'ninguém acessa a sequence de acessos_log');

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
select results_eq($$select count(*)::int from lojistas where id in (tests.id('l1'), tests.id('l2'), tests.id('l3'))$$,
  array[3], 'admin vê todos');
select results_eq($$select count(*)::int from acessos_log where user_id in (tests.id('l1'), tests.id('l2'), tests.id('l3'))$$,
  array[1], 'admin lê acessos_log');

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

-- I-1: lojista anonimizado com JWT ainda válido não escreve dados pessoais
update lojistas set anonimizado_em = now() where id = :'l2';
select tests.autenticar_como(tests.id('l2'));
select is_empty($$with u as (update lojistas set telefone = '81988887777' where id = tests.id('l2') returning id) select * from u$$,
  'anonimizado não altera o próprio cadastro');
select tests.como_superuser();
select is((select telefone from lojistas where id = :'l2'), null, 'telefone do anonimizado continua nulo');

-- I-2: anonimizar_auth apaga PII do schema auth (somente service role executa)
select has_function('public', 'anonimizar_auth', array['uuid', 'text'], 'função anonimizar_auth existe');
select ok(not has_function_privilege('anon', 'public.anonimizar_auth(uuid, text)', 'execute'), 'anon não executa anonimizar_auth');
select ok(not has_function_privilege('authenticated', 'public.anonimizar_auth(uuid, text)', 'execute'),
  'authenticated não executa anonimizar_auth');
select ok(not has_function_privilege('public', 'public.anonimizar_auth(uuid, text)', 'execute'), 'PUBLIC não executa anonimizar_auth');
select ok(has_function_privilege('service_role', 'public.anonimizar_auth(uuid, text)', 'execute'), 'service_role executa anonimizar_auth');

-- cenário: L3 com metadados, troca de e-mail pendente, telefone, identidade, sessão, tokens e auditoria
update auth.users set raw_user_meta_data = '{"nome": "Fulano", "email": "l3@loja.test"}'::jsonb,
  email_change = 'l3-novo@loja.test', email_change_token_new = 'tok-new', email_change_token_current = 'tok-cur',
  confirmation_token = 'tok-conf', recovery_token = 'tok-rec', phone = '5581999990000', phone_change = '5581999990001'
  where id = :'l3';
insert into auth.identities (provider_id, user_id, identity_data, provider)
  values (:'l3', :'l3', jsonb_build_object('sub', :'l3', 'email', 'l3@loja.test', 'email_verified', true), 'email');
select gen_random_uuid() as s3 \gset
insert into auth.sessions (id, user_id, created_at) values (:'s3', :'l3', now());
insert into auth.refresh_tokens (token, user_id, session_id, revoked) values ('rt-l3', :'l3', :'s3', false);
insert into auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to)
  values (gen_random_uuid(), :'l3', 'recovery_token', 'hash-l3', 'l3@loja.test');
insert into auth.audit_log_entries (id, payload, created_at, ip_address) values
  (gen_random_uuid(), json_build_object('actor_id', :'l3', 'action', 'login', 'actor_username', 'l3@loja.test'), now(), '10.0.0.1'),
  (gen_random_uuid(), json_build_object('actor_id', '00000000-0000-0000-0000-000000000000', 'action', 'user_modified',
     'traits', json_build_object('user_id', :'l3', 'user_email', 'l3@loja.test')), now(), '10.0.0.2');

select lives_ok($$select public.anonimizar_auth(tests.id('l3'), 'anonimizado-l3@invalid')$$, 'anonimizar_auth roda');
select is((select raw_user_meta_data from auth.users where id = :'l3'), '{}'::jsonb, 'user_metadata apagado');
select ok((select coalesce(email_change, '') = '' and coalesce(email_change_token_new, '') = ''
  and coalesce(email_change_token_current, '') = '' and coalesce(confirmation_token, '') = ''
  and coalesce(recovery_token, '') = '' and phone is null and coalesce(phone_change, '') = ''
  from auth.users where id = :'l3'), 'tokens, troca de e-mail e telefone limpos');
select is((select identity_data->>'email' from auth.identities where user_id = :'l3'), 'anonimizado-l3@invalid',
  'identity_data.email anonimizado');
select is((select email from auth.identities where user_id = :'l3'), 'anonimizado-l3@invalid', 'identities.email (gerado) anonimizado');
select is_empty($$select 1 from auth.sessions where user_id = tests.id('l3')$$, 'sessões revogadas');
select is_empty($$select 1 from auth.refresh_tokens where user_id = tests.id('l3')::text$$, 'refresh tokens apagados');
select is_empty($$select 1 from auth.one_time_tokens where user_id = tests.id('l3')$$, 'one-time tokens apagados');
select is_empty($$select 1 from auth.audit_log_entries where payload->>'actor_id' = tests.id('l3')::text
  or payload->'traits'->>'user_id' = tests.id('l3')::text$$, 'auditoria do usuário apagada');
select ok(not exists (select 1 from auth.users u where u.id = :'l3' and u::text like '%l3@loja.test%')
  and not exists (select 1 from auth.identities i where i.user_id = :'l3' and i::text like '%l3@loja.test%'),
  'e-mail antigo não aparece em auth.users nem auth.identities');

select * from finish();
rollback;
