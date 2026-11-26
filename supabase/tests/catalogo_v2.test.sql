begin;
\ir _helpers.psql
select plan(40);

-- ===== cenário (superusuário) =====
-- P ativo preço 100; Q inativo; R ativo sem preço; S ativo preço 33.33.
-- l1 ativo com desconto geral 10 e exceção 5 em P; l3 desativado.
select gen_random_uuid() as p, gen_random_uuid() as q, gen_random_uuid() as r, gen_random_uuid() as s,
       gen_random_uuid() as x \gset
insert into produtos (id, nome, codigo, ativo) values
  (:'p', 'Produto P', 'V2-P', true),
  (:'q', 'Produto Q', 'V2-Q', false),
  (:'r', 'Produto R', 'V2-R', true),
  (:'s', 'Produto S', 'V2-S', true);
insert into produto_precos (produto_id, preco) values (:'p', 100), (:'s', 33.33);
update lojistas set desconto_percentual = 10 where id = tests.id('l1');
insert into lojista_descontos_produto (lojista_id, produto_id, desconto_percentual) values (tests.id('l1'), :'p', 5);
select set_config('tests.p', :'p', true), set_config('tests.q', :'q', true),
       set_config('tests.r', :'r', true), set_config('tests.s', :'s', true),
       set_config('tests.x', :'x', true);

-- ===== estrutura =====
select has_column('public', 'produtos', 'slug', 'produtos.slug existe');
select col_not_null('public', 'produtos', 'slug', 'produtos.slug é not null');
select has_column('public', 'produtos', 'ean', 'produtos.ean existe');
select col_type_is('public', 'produtos', 'cest', 'character(7)', 'produtos.cest é char(7)');

-- ===== slug =====
select is(public.gerar_slug('NX 3631445', 'Placa controladora — potência LT15F'),
  'nx-3631445-placa-controladora-potencia-lt15f', 'gerar_slug tira acentos e símbolos');
select is(length(public.gerar_slug(repeat('a', 50), repeat('b', 50))), 80, 'gerar_slug corta em 80');
select is((select slug from produtos where id = :'p'), 'v2-p-produto-p', 'slug gerado no insert');

insert into produtos (nome, codigo) values ('Dup X', 'AB 1'), ('dup x', 'ab-1');
select is((select slug from produtos where codigo = 'AB 1'), 'ab-1-dup-x', 'primeiro recebe o slug base');
select is((select slug from produtos where codigo = 'ab-1'), 'ab-1-dup-x-2', 'segundo com mesmo slug recebe -2');

update produtos set nome = 'Produto P renomeado' where id = :'p';
select is((select slug from produtos where id = :'p'), 'v2-p-produto-p', 'mudar nome não muda slug já existente');
update produtos set slug = '' where id = :'p';
select is((select slug from produtos where id = :'p'), 'v2-p-produto-p-renomeado', 'slug vazio é regenerado');

select throws_ok($$insert into produtos (nome, codigo, slug) values ('x', 'V2-SLUG', 'Com Espaço')$$,
  '23514', null, 'slug fora do padrão viola check');
select throws_ok($$insert into produtos (nome, codigo, ean) values ('x', 'V2-EAN', '123')$$,
  '23514', null, 'ean inválido viola check');
select throws_ok($$insert into produtos (nome, codigo, cest) values ('x', 'V2-CEST', '12a4567')$$,
  '23514', null, 'cest inválido viola check');
select throws_ok($$insert into produtos (nome, codigo, ncm) values ('x', 'V2-NCM', '1234567a')$$,
  '23514', null, 'ncm inválido viola check');
select lives_ok($$insert into produtos (nome, codigo, ean, cest, ncm) values ('x', 'V2-OK', '7891234567895', '1234567', '85371090')$$,
  'ean/cest/ncm válidos aceitos');

-- ===== privilégios =====
select ok(not has_function_privilege('anon', 'public.precos_cliente(uuid[])', 'execute'), 'anon não executa precos_cliente');
select ok(not has_function_privilege('anon', 'public.carrinho_adicionar(uuid, int)', 'execute'), 'anon não executa carrinho_adicionar');
select ok(not has_function_privilege('anon', 'public.admin_importar_produtos(jsonb)', 'execute'), 'anon não executa admin_importar_produtos');
select ok(has_function_privilege('authenticated', 'public.precos_cliente(uuid[])', 'execute'), 'authenticated executa precos_cliente');

-- ===== preços do cliente =====
select tests.autenticar_como(tests.id('l1'));
select results_eq($$select preco_tabela, desconto_percentual, preco_final from public.precos_cliente(array[tests.id('p')])$$,
  $$values (100::numeric, 5::numeric, 95.00::numeric)$$, 'l1: exceção de 5% em P');
select results_eq($$select preco_final from public.precos_cliente(array[tests.id('s')])$$,
  array[30.00::numeric], 'l1: desconto geral 10% em 33.33 = 30.00');
select is_empty($$select * from public.precos_cliente(array[tests.id('r')])$$, 'produto sem preço: sem linhas');

select tests.autenticar_como(tests.id('l3'));
select is_empty($$select * from public.precos_cliente(array[tests.id('p')])$$, 'cliente desativado: sem linhas');
select tests.autenticar_como(tests.id('x'));
select is_empty($$select * from public.precos_cliente(array[tests.id('p')])$$, 'logado sem cadastro de lojista: sem linhas');
select tests.anonimo();
select throws_ok($$select * from public.precos_cliente(array[tests.id('p')])$$, '42501', null, 'visitante: sem acesso');

-- ===== carrinho =====
select tests.autenticar_como(tests.id('l1'));
select is(public.carrinho_adicionar(tests.id('p'), 2), 2, 'carrinho_adicionar cria a linha');
select is(public.carrinho_adicionar(tests.id('p'), 3), 5, 'carrinho_adicionar soma à linha existente');
select is(public.carrinho_adicionar(tests.id('p'), 9999), 9999, 'carrinho_adicionar limita a 9999');
select throws_ok($$select public.carrinho_adicionar(tests.id('p'), 0)$$, 'P0001', 'quantidade_invalida', 'quantidade 0 rejeitada');
select throws_ok($$select public.carrinho_adicionar(tests.id('p'), 99999)$$, 'P0001', 'quantidade_invalida', 'quantidade 99999 rejeitada');
select throws_ok($$select public.carrinho_adicionar(tests.id('q'), 1)$$, '42501', null, 'produto inativo barrado pela RLS');

-- ===== importação =====
select throws_ok($$select public.admin_importar_produtos('[]')$$, 'P0001', 'nao_autorizado', 'lojista não importa');

select tests.autenticar_como(tests.id('a'));
select is(public.admin_importar_produtos('[{"codigo":"IMP1","nome":"Importado","preco":10,
  "especificacoes":[{"nome":"A","valor":"1"},{"nome":"B","valor":"2"}],"imagens":[{"url":"https://x/a.jpg"}]}]'),
  '{"criados":1,"atualizados":0}'::jsonb, 'importação cria produto');
select is(public.admin_importar_produtos('[{"codigo":"IMP1","nome":"Importado","preco":null,
  "especificacoes":[{"nome":"C","valor":"3"}]}]'),
  '{"criados":0,"atualizados":1}'::jsonb, 'reimportação atualiza produto');
select results_eq($$select
    (select count(*)::int from produto_especificacoes e join produtos p on p.id = e.produto_id where p.codigo = 'IMP1'),
    (select count(*)::int from produto_precos pp join produtos p on p.id = pp.produto_id where p.codigo = 'IMP1')$$,
  $$values (1, 0)$$, 'reimportação: 1 especificação e preço apagado');

-- R1: atualização por id (permite trocar o código) e slug explícito
select set_config('tests.imp1', (select id::text from produtos where codigo = 'IMP1'), true);
select is(public.admin_importar_produtos(jsonb_build_array(jsonb_build_object(
    'id', tests.id('imp1'), 'codigo', 'IMP1B', 'nome', 'Importado B', 'slug', ''))),
  '{"criados":0,"atualizados":1}'::jsonb, 'atualização por id conta como atualizado');
select results_eq($$select count(*)::int, min(codigo), min(slug) from produtos where codigo in ('IMP1', 'IMP1B')$$,
  $$values (1, 'IMP1B', 'imp1-importado')$$, 'por id: troca o código, mantém uma linha e o slug');
select is(public.admin_importar_produtos('[{"codigo":"IMP2","nome":"Outro","slug":"meu-slug-explicito"}]'),
  '{"criados":1,"atualizados":0}'::jsonb, 'importação com slug explícito cria produto');
select is((select slug from produtos where codigo = 'IMP2'), 'meu-slug-explicito', 'slug explícito é gravado');

select * from finish();
rollback;
