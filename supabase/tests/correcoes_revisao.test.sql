begin;
\ir _helpers.psql
select plan(17);

-- ===== cenário (superusuário) =====
-- P1 preço 100; l1 com endereço completo e 1 unidade de P1 no carrinho; cupom CMIN exige 1000.
select gen_random_uuid() as p1 \gset
insert into produtos (id, nome, codigo, ativo) values (:'p1', 'Produto Um', 'REV-P1', true);
insert into produto_precos (produto_id, preco) values (:'p1', 100);
update lojistas set cep = '50000000', logradouro = 'Rua A', numero = '1',
  bairro = 'Centro', cidade = 'Recife', uf = 'PE' where id = tests.id('l1');
insert into cupons (codigo, tipo, valor, valor_minimo_pedido) values ('REVMIN', 'percentual', 5, 1000);
insert into carrinho_itens (lojista_id, produto_id, quantidade) values (tests.id('l1'), :'p1', 1);
select set_config('tests.p1', :'p1', true);

-- ===== limites de quantidade =====
select throws_ok($$insert into pedido_itens (pedido_id, produto_id, produto_nome, produto_codigo, quantidade,
    preco_tabela, preco_unitario) values (gen_random_uuid(), tests.id('p1'), 'x', 'x', 10000, 1, 1)$$,
  '23514', null, 'pedido_itens com quantidade 10000 viola check');

select tests.autenticar_como(tests.id('l1'));
select throws_ok($$update carrinho_itens set quantidade = 10000 where lojista_id = tests.id('l1')$$,
  '23514', null, 'lojista não grava quantidade 10000 direto no carrinho');
select throws_ok($$update carrinho_itens set quantidade = 0 where lojista_id = tests.id('l1')$$,
  '23514', null, 'lojista não grava quantidade 0 direto no carrinho');
select lives_ok($$update carrinho_itens set quantidade = 9999 where lojista_id = tests.id('l1')$$,
  'quantidade 9999 é aceita');
select lives_ok($$update carrinho_itens set quantidade = 1 where lojista_id = tests.id('l1')$$,
  'quantidade 1 é aceita');

-- ===== criar_pedido devolve valor_minimo no cupom_invalido =====
select set_config('tests.r', public.criar_pedido('REVMIN')::text, true);
select results_eq($$select r->>'erro', r->>'motivo', (r->>'valor_minimo')::numeric
  from (select current_setting('tests.r')::jsonb r) t$$,
  $$values ('cupom_invalido', 'valor_minimo', 1000.00::numeric)$$,
  'criar_pedido com cupom abaixo do mínimo devolve valor_minimo');

-- ===== cupom percentual até 100 =====
select tests.como_superuser();
select throws_ok($$insert into cupons (codigo, tipo, valor) values ('REV101', 'percentual', 101)$$,
  '23514', null, 'cupom percentual acima de 100 viola check');
select lives_ok($$insert into cupons (codigo, tipo, valor) values ('REV100', 'percentual', 100)$$,
  'cupom percentual de 100 é aceito');
select lives_ok($$insert into cupons (codigo, tipo, valor) values ('REV150V', 'valor', 150)$$,
  'cupom em valor acima de 100 é aceito');

-- ===== importação: flags manter_* =====
select tests.autenticar_como(tests.id('a'));
select is(public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":10,
  "manual_url":"https://x/m.pdf",
  "especificacoes":[{"nome":"A","valor":"1"}],"imagens":[{"url":"https://x/a.jpg"}]}]'),
  '{"criados":1,"atualizados":0}'::jsonb, 'importação cria produto com espec, imagem e manual');

select public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":10,
  "manter_especificacoes":true,"especificacoes":[],"imagens":[{"url":"https://x/b.jpg"}],
  "manual_url":"https://x/m.pdf"}]');
select results_eq($$select
    (select count(*)::int from produto_especificacoes e join produtos p on p.id = e.produto_id where p.codigo = 'REVIMP'),
    (select string_agg(i.url, ',') from produto_imagens i join produtos p on p.id = i.produto_id where p.codigo = 'REVIMP')$$,
  $$values (1, 'https://x/b.jpg')$$, 'manter_especificacoes mantém as especificações (imagens substituídas)');

select public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":10,
  "manter_imagens":true,"imagens":[],"especificacoes":[{"nome":"B","valor":"2"}],
  "manual_url":"https://x/m.pdf"}]');
select results_eq($$select
    (select string_agg(e.nome, ',') from produto_especificacoes e join produtos p on p.id = e.produto_id where p.codigo = 'REVIMP'),
    (select string_agg(i.url, ',') from produto_imagens i join produtos p on p.id = i.produto_id where p.codigo = 'REVIMP')$$,
  $$values ('B', 'https://x/b.jpg')$$, 'manter_imagens mantém as imagens (especificações substituídas)');

select public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":10,
  "manter_manual":true,"manual_url":null,"manter_imagens":true,"manter_especificacoes":true}]');
select is((select manual_url from produtos where codigo = 'REVIMP'), 'https://x/m.pdf',
  'manter_manual mantém o manual atual');

select public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":10,
  "manter_manual":true,"manual_url":"https://x/novo.pdf","manter_imagens":true,"manter_especificacoes":true}]');
select is((select manual_url from produtos where codigo = 'REVIMP'), 'https://x/m.pdf',
  'manter_manual ignora o manual enviado');

-- Sem flags (formulário do admin): substituição completa.
select public.admin_importar_produtos('[{"codigo":"REVIMP","nome":"Imp","preco":null}]');
select results_eq($$select
    (select count(*)::int from produto_especificacoes e join produtos p on p.id = e.produto_id where p.codigo = 'REVIMP'),
    (select count(*)::int from produto_imagens i join produtos p on p.id = i.produto_id where p.codigo = 'REVIMP'),
    (select count(*)::int from produto_precos pp join produtos p on p.id = pp.produto_id where p.codigo = 'REVIMP'),
    (select manual_url from produtos where codigo = 'REVIMP')$$,
  $$values (0, 0, 0, null::text)$$, 'sem flags: especificações, imagens, preço e manual removidos');

-- Produto novo com flags: não há o que manter, grava o que veio.
select is(public.admin_importar_produtos('[{"codigo":"REVNOVO","nome":"Novo","manter_imagens":true,
  "manter_especificacoes":true,"manter_manual":true,"manual_url":"https://x/n.pdf",
  "especificacoes":[{"nome":"A","valor":"1"}],"imagens":[{"url":"https://x/n.jpg"}]}]'),
  '{"criados":1,"atualizados":0}'::jsonb, 'produto novo com flags é criado');
select results_eq($$select
    (select count(*)::int from produto_especificacoes e join produtos p on p.id = e.produto_id where p.codigo = 'REVNOVO'),
    (select count(*)::int from produto_imagens i join produtos p on p.id = i.produto_id where p.codigo = 'REVNOVO'),
    (select manual_url from produtos where codigo = 'REVNOVO')$$,
  $$values (1, 1, 'https://x/n.pdf')$$, 'produto novo com flags grava especificações, imagens e manual');

select * from finish();
rollback;
