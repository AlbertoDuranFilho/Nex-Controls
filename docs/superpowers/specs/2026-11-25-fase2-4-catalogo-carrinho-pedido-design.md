# Fases 2–4 — Catálogo, Carrinho e Pedido (sem pagamento online)

Continua a [Fase 1](2026-09-15-supabase-foundation-auth-design.md), que segue
valendo para tudo que este documento não muda (abordagem A, RLS, idiomas,
UX, desempenho, LGPD, ambientes e CI).

## Intenção

Deixar o site **funcionando de ponta a ponta hoje**:
- o visitante vê o catálogo e baixa manuais;
- o lojista logado vê preços com o seu desconto, monta o carrinho, aplica
  cupom e **gera o pedido**;
- a Nex administra produtos, preços, descontos, cupons e pedidos pelo painel.

**Pagamento online (Stone) e nota automática (Mainô) ficam desligados.** No
lugar deles entra o fluxo manual, que é o **plano B** permanente:
1. O cliente gera o pedido e recebe um e-mail com a confirmação, os itens, o
   valor e o aviso de que a Nex vai entrar em contato.
2. A Nex recebe o pedido por e-mail.
3. A Nex emite a nota pela Mainô manualmente, cobra o cliente por fora e
   atualiza o status do pedido no painel.

O objetivo final continua sendo Stone e Mainô automáticas. Elas entram
depois, quando o usuário enviar a documentação da Mainô e confirmar o produto
da Stone (provavelmente Pagar.me). Elas não podem exigir mudança na regra do
pedido.

Por que agora: o Strapi hospedado no Render está fora do ar (erro 503). Por
isso o catálogo e o formulário de contato do site atual estão quebrados.

## Metas, não-metas e antimetas

**Metas**
- Catálogo público vindo do Supabase, sem preço.
- Preço com desconto, carrinho, cupom ("vale o maior") e gerar pedido para o
  lojista ativo.
- E-mails de pedido para o cliente e para a Nex.
- Aba "Pedidos" na área do cliente.
- Painel do admin com: produtos (imagens, manual, especificações, dados
  fiscais, preço), descontos por produto para cada cliente, cupons, e
  pedidos com troca de status.
- Formulário de contato funcionando sem Strapi.
- Nenhuma parte do site depende mais do Strapi.

**Não-metas (agora)**
- Integração com Stone e com Mainô (fica só o esqueleto descrito abaixo).
- Cálculo de frete: aparece como **"a combinar"** e é gravado como 0.
- Cálculo de ICMS/DIFAL: a função existe e retorna 0.
- Importar produtos por planilha. O Strapi está fora do ar e a cópia local
  tem 1 produto, então o cadastro é feito pelo painel.
- App mobile, que terá fase própria.
- Redesign premium: usar os tokens preto/branco já existentes, sem o azul
  antigo.
- E-mails de mudança de status do pedido.
- "Esqueci minha senha".

**Antimetas (seria fracasso mesmo funcionando)**
- O preço ou o desconto do pedido vir do navegador.
- Visitante ou cliente desativado conseguir ver preço.
- Cupom usado acima do limite em pedidos simultâneos.
- O pedido se perder porque o e-mail falhou.
- Uma página pública lenta porque ficou dinâmica só por causa do preço.

## Abordagens consideradas

| | Como | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | A **função `criar_pedido` no Postgres** recalcula tudo a partir das tabelas e grava o pedido em uma transação. O site envia os e-mails pelo Resend logo depois. | O preço nunca vem do cliente. O app reaproveita a mesma função. É rápido de entregar. Um e-mail que falha não perde o pedido. | A regra fica em SQL. |
| B | Server Action do Next calcula com service role e grava | Um pouco mais rápida hoje | Regra fora do banco; o app teria que duplicá-la; contraria a abordagem A da Fase 1 |
| C | Edge Function faz pedido e e-mail | Boa para o app | Mais peças para publicar hoje. É o lugar certo para os webhooks da Stone e da Mainô, não para o pedido em si. |

**Escolha do usuário: A.**

## Regras de negócio

### Catálogo
- Visitante e cliente veem produtos **ativos**, com fotos, especificações,
  descrição, aplicações, compatibilidade e **manual em PDF** para baixar.
- O preço aparece só para **lojista ativo** (a RLS da Fase 1 já garante).
  Visitante vê "Entre para ver preços". Cliente desativado vê "Sua conta
  está inativa, fale com a Nex".
- Produto sem preço cadastrado aparece no catálogo, mas mostra "Sob
  consulta" e não pode ir para o carrinho.

### Preço do cliente
- Preço de tabela: `produto_precos.preco`.
- Desconto do cliente para o produto: a exceção em
  `lojista_descontos_produto`, se houver; senão, `lojistas.desconto_percentual`.
- Preço com desconto = preço de tabela × (1 − desconto/100). O arredondamento
  é para 2 casas, **por unidade**, antes de multiplicar pela quantidade, para
  que os números da tela, do e-mail e da nota batam.

### Cupom
Validações:
- O código é digitado sem diferenciar maiúsculas de minúsculas e comparado
  em MAIÚSCULAS.
- O cupom precisa estar `ativo` e dentro do período `valido_de`/`valido_ate`.
  Se esses campos forem nulos, não há limite de data.
- Se o cupom tiver `lojista_id`, só vale para aquele cliente.
- Se tiver `valor_minimo_pedido`, ele é comparado com o **subtotal de
  tabela**.
- `max_usos`: conta os pedidos com esse cupom que não estão `cancelado`.
- **Uso único por cliente** (decisão minha): um cliente não usa o mesmo cupom
  em dois pedidos não cancelados. Motivo: é o padrão do mercado e evita
  abuso. O custo, se eu estiver errado, é tornar isso uma opção do cupom.

Valor do desconto:
- Cupom percentual: o percentual é aplicado sobre o subtotal de tabela.
- Cupom de valor fixo: o valor é limitado ao subtotal de tabela.

O cliente nunca lê a tabela `cupons`. A validação acontece só dentro das
funções.

### Vale o maior
- Desconto do cliente = soma de (preço de tabela − preço com desconto) ×
  quantidade, somando todos os itens.
- O sistema aplica **o maior** entre o desconto do cliente e o do cupom,
  nunca os dois. Em caso de **empate**, vale o do cliente e o cupom não é
  consumido.
- Se o cupom vencer, os itens vão com o preço de tabela (desconto 0 no item)
  e o desconto fica no pedido (`desconto_origem = 'cupom'`).
- Se o cliente vencer, cada item leva o próprio desconto
  (`desconto_origem = 'cliente'`).
- Sem nenhum desconto, `desconto_origem = 'nenhum'`.
- Se o cupom for válido, mas pior, a tela explica: "Seu desconto atual já é
  maior que o deste cupom". Se for inválido, a tela diz o motivo: expirado,
  esgotado, já usado, valor mínimo de R$ X, ou inexistente.

### Totais
- `subtotal` = soma do preço de tabela × quantidade.
- `total` = subtotal − desconto aplicado + frete (0) + ICMS (0) + DIFAL (0).

### Pedido
Para gerar o pedido, todas estas condições valem:
- lojista ativo e não anonimizado;
- endereço completo (CEP, logradouro, número, bairro, cidade, UF);
- carrinho não vazio;
- todos os itens ativos e com preço.

Se alguma falhar, a função retorna o motivo e não grava nada.

Ao gerar o pedido:
- Snapshot do cliente: documento, nome, tipo de pessoa, IE e indicador, e
  endereço.
- Snapshot dos itens: nome, código, preço de tabela, desconto e preço
  unitário.
- O carrinho é esvaziado na **mesma transação**.
- Status inicial: `aguardando_pagamento`. `gateway_provider = 'manual'`.
- O cliente pode escrever uma **observação** opcional, como "entregar à
  tarde" ou "frete via transportadora X". É uma coluna nova, limitada a 500
  caracteres.
- Se o resultado do cálculo for diferente do que o cliente viu na tela (um
  preço mudou entre a tela e o clique), o pedido é gravado com o valor novo.
  A tela de confirmação mostra o valor gravado. Decisão minha: o comum no
  mercado é avisar antes. Aqui, o pedido manual é conferido pela Nex antes
  da cobrança. O custo, se eu estiver errado, é adicionar uma checagem de
  "valor esperado".

### Status do pedido (fluxo manual)
- Só o admin altera o status, por uma função. Não há `UPDATE` direto (regra
  registrada na Fase 1).
- Transições permitidas:
  - `aguardando_pagamento` → `pago` ou `cancelado`
  - `pago` → `faturado` ou `cancelado`
  - `faturado` → `enviado`
  - `enviado` → `entregue`
  - `entregue` → `devolvido`
- O admin também pode registrar **número e link da nota**, preenchendo
  `maino_nota_id` e `maino_nota_url` à mão, para o cliente ver na aba
  Pedidos.
- Toda mudança grava quem fez e quando, em uma tabela nova
  `pedido_eventos (pedido_id, status_de, status_para, admin_id, criado_em)`.
  Ela fica sem dados pessoais e também serve para começar o "log de ações do
  admin" pendente da Fase 1.

## Esqueleto de Stone e Mainô
- Flags no servidor: `FEATURE_PAGAMENTO_ONLINE=false` e
  `FEATURE_NFE_AUTOMATICA=false`.
- Com as duas desligadas, vale o fluxo manual deste documento.
- O banco já tem `metodo_pagamento`, `gateway_provider`,
  `gateway_transaction_id`, `status_pagamento`, `maino_nota_id` e
  `maino_nota_url`. Os status `pago`, `faturado` e `erro_pagamento` já
  existem.
- **Nenhum código de integração é escrito agora** (decisão minha): sem a
  documentação da Mainô e sem confirmar o produto da Stone, qualquer
  adaptador seria um palpite. Na próxima fase, as integrações entram como
  Edge Functions:
  - pagamento chamado depois de `criar_pedido`;
  - webhook que muda o status para `pago` e chama a emissão da nota.
- O custo, se eu estiver errado: nenhum retrabalho na regra do pedido.

## Contato e e-mails
- **Formulário de contato:** passa a ser uma Server Action que envia o
  e-mail pelo Resend para `contato@nexcontrols.com`, com o e-mail do
  visitante em "responder para".
  - Proteção contra spam: campo invisível (honeypot) e limite simples por IP
    (5 envios por hora, guardado em memória, porque o plano é gratuito).
  - Nada é gravado no banco, para não acumular dados pessoais.
- **E-mails de pedido** (só em português, como na Fase 1):
  - Para o cliente: número, itens, quantidades, preços, desconto aplicado,
    frete "a combinar", total, observação e o texto "Recebemos seu pedido.
    A Nex entrará em contato para combinar frete e pagamento."
  - Para a Nex (`EMAIL_PEDIDOS_DESTINO`, padrão `contato@nexcontrols.com`):
    o mesmo conteúdo, mais o documento, a IE, o endereço, os contatos do
    cliente e o link para o pedido no painel.
- O envio acontece **depois** do pedido gravado. Se falhar:
  - o pedido continua válido;
  - o erro vai para o log do servidor;
  - o painel mostra o pedido como "e-mail não enviado" (coluna nova
    `notificado_em`, nula se o envio falhou);
  - o admin tem o botão "reenviar e-mails".
- Remetente: o domínio da Nex já configurado no Resend. Nova variável no
  servidor: `RESEND_API_KEY`.

## Telas

**Público (pt/en/es)**
- `/catalogo`: grade de produtos com busca por nome ou código. A busca
  roda no navegador, porque são poucos produtos.
- `/catalogo/[slug]`: fotos, especificações, textos, botão do manual e
  bloco de preço.
  - **`slug`** é coluna nova e única, gerada do código e do nome. O admin
    pode editar.
  - Links antigos com `documentId` do Strapi não precisam continuar
    funcionando, porque o Strapi está fora do ar.
- O bloco de preço é uma ilha dinâmica (`Suspense` + skeleton). Para o
  lojista ativo, mostra: preço de tabela riscado, quando houver desconto;
  preço com desconto; quantidade; e "Adicionar ao carrinho".
- As páginas de catálogo ficam **estáticas/ISR**. Quando o admin salva um
  produto, o site revalida as páginas por tag.
- Home: a seção de catálogo existente passa a ler do Supabase.

**Cliente**
- Ícone de carrinho no cabeçalho, com a contagem de itens. Aparece só para
  quem está logado.
- `/cliente/carrinho`:
  - itens com quantidade editável e botão de remover;
  - preço unitário com desconto;
  - campo de cupom com o resultado da regra "vale o maior";
  - resumo: subtotal, desconto (dizendo a origem), frete "a combinar" e
    total;
  - observação;
  - botão **"Gerar pedido"**.
  - Itens que ficaram inativos ou sem preço aparecem marcados e bloqueiam o
    botão até serem removidos.
  - Se faltar o endereço, aparece um aviso com link para `/cliente/endereco`.
- Confirmação do pedido: número, resumo e o aviso de que a Nex vai entrar em
  contato.
- `/cliente/pedidos`: lista com número, data, status e total.
- `/cliente/pedidos/[numero]`: detalhe com itens, totais, status e link da
  nota, se houver.
- A aba "Pedidos" entra na navegação da área do cliente.

**Admin (só português)**
- **`/admin/produtos`:** lista com busca, ativo/inativo e preço.
- **Novo produto e edição:**
  - dados: nome, código, slug, descrição e aplicações (markdown simples),
    compatibilidade e destaque;
  - dados fiscais: NCM, origem e unidade;
  - peso e dimensões, ativo, preço;
  - **imagens**: upload, ordem e texto alternativo;
  - **especificações**: lista de nome e valor;
  - **manual**: upload de PDF.
- **Uploads no Cloudinary**, mantendo a decisão da Fase 1 (as mídias atuais
  já estão lá). O upload vai do navegador direto para o Cloudinary com uma
  assinatura gerada por Server Action de admin.
  - Novas variáveis no servidor: `CLOUDINARY_CLOUD_NAME`,
    `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
  - Imagens são limitadas a 5 MB e PDFs a 20 MB.
- **Descontos por produto:** fica na página do lojista
  (`/admin/lojistas/[id]`), abaixo do desconto geral que já existe.
  Mostra a lista de exceções (produto e %), com adicionar e remover.
- **`/admin/cupons`:** lista com os usos (usados/limite), criar, editar e
  desativar. Cupons não são apagados, porque o histórico de pedidos
  referencia o cupom.
- **`/admin/pedidos`:**
  - lista filtrável por status, com número, data, cliente, total, status e
    um aviso quando o e-mail não foi enviado;
  - detalhe com todos os snapshots, a troca de status (só as transições
    permitidas), os campos de nota, o histórico de eventos e o botão
    "reenviar e-mails".
- A navegação do admin ganha: Lojistas, Produtos, Cupons e Pedidos.

## Banco (migrations novas; as antigas não são editadas)
- `produtos.slug text unique not null`, com preenchimento para as linhas
  existentes.
- `pedidos.observacao text check (char_length <= 500)` e
  `pedidos.notificado_em timestamptz`.
- Tabela `pedido_eventos`:
  - RLS: admin lê; o cliente lê os eventos dos próprios pedidos, sem
    `admin_id` (via view ou coluna não concedida).
- Funções:
  - **`precos_cliente(produto_ids uuid[])`** (security invoker, a RLS
    filtra): retorna `produto_id`, `preco_tabela`, `desconto_percentual` e
    `preco_final`. Para quem não é lojista ativo, não retorna linhas.
  - **`simular_pedido(cupom text)`** (security definer, para o
    próprio `auth.uid()`): retorna os itens calculados, o subtotal, o
    desconto do cliente, o desconto do cupom, o desconto escolhido, a origem,
    o total, a situação do cupom e os bloqueios (itens inválidos, sem
    endereço). Alimenta a tela do carrinho.
  - **`criar_pedido(cupom text, observacao text)`** (security definer): usa
    o mesmo cálculo interno de `simular_pedido`, sem duplicar a regra.
    - Trava a linha do cupom (`for update`) para garantir `max_usos` e o uso
      único por cliente mesmo com pedidos simultâneos.
    - Grava o pedido e os itens e esvazia o carrinho.
    - Retorna `id` e `numero`.
  - **`calcular_impostos(...)`**: retorna ICMS e DIFAL iguais a 0. É o
    esqueleto da Fase 1.
  - **`admin_atualizar_pedido(pedido_id, novo_status, nota_id, nota_url)`**:
    só admin; valida as transições; grava em `pedido_eventos`.
  - **`marcar_pedido_notificado(pedido_id)`**: execute só para
    service_role, chamada pela Server Action depois do envio.
- `execute` dessas funções: `authenticated` nas do cliente, revogado de
  `anon` e `public`.

## Remoções
- `web/services/strapi.ts`, `web/types/Produto.ts` (substituído pelos tipos
  gerados) e a variável `NEXT_PUBLIC_STRAPI_URL`.
- As pastas `backend/` (Strapi) e `mobile/` **não são tocadas**. O usuário
  desliga o Render quando quiser.
- **Endereço da empresa:** a linha `TODO_ENDERECO` sai do rodapé agora. O
  Decreto 7.962 exige endereço físico para vender online; o usuário não quer
  publicar o endereço por enquanto. Decisão minha: a trava de build passa a
  exigir o endereço **só quando `FEATURE_PAGAMENTO_ONLINE=true`**. O custo,
  se eu estiver errado, é que o fluxo manual também é uma venda online, e
  por isso fica registrado como pendência legal para o usuário e o advogado
  decidirem.

## Testes
- **pgTAP:**
  - `precos_cliente`: visitante, desativado, exceção por produto e
    arredondamento;
  - `simular_pedido`: cada motivo de cupom inválido, "vale o maior" para os
    dois lados, empate e cupom de valor maior que o subtotal;
  - `criar_pedido`: sem endereço, carrinho vazio, item inativo, item sem
    preço, uso único, `max_usos`, snapshot correto, carrinho esvaziado e
    cliente B não cria pedido com o carrinho de A;
  - `admin_atualizar_pedido`: não admin é recusado, transição inválida é
    recusada e o evento é gravado;
  - RLS de `pedido_eventos`;
  - execute negado a `anon`.
- **Vitest:**
  - montagem dos e-mails (conteúdo e escape de HTML);
  - geração de slug;
  - validação do formulário de contato e honeypot;
  - mapeamento dos motivos de cupom para mensagens.
- **Playwright:**
  - visitante vê o catálogo sem preço e baixa o manual;
  - lojista vê o preço com desconto, adiciona ao carrinho, aplica um cupom
    melhor e um pior e gera o pedido; o pedido aparece em "Pedidos";
  - admin cria produto com preço, cria cupom, muda o status do pedido, e o
    cliente vê o novo status;
  - o formulário de contato envia (o envio do e-mail é simulado nos testes).
- **E-mail em testes:** com `RESEND_API_KEY` ausente fora de produção, os
  e-mails são gravados no log e não são enviados. A trava de build exige a
  chave em produção.

## Detalhes decididos na revisão (decisões minhas)
- **Carrinho:**
  - fica só no banco (`carrinho_itens`), com escrita direta pela RLS já
    existente;
  - nova migration acrescenta `WITH CHECK` exigindo produto ativo;
  - a contagem do cabeçalho é um `count` simples;
  - itens sem preço são barrados por `simular_pedido`/`criar_pedido`.
- **Cupom que perde ou empata:** o pedido grava `cupom_id = null`. Ele não
  conta para `max_usos` nem para o uso único.
- **Comparação "vale o maior":** sempre em reais. O `valor_minimo_pedido`
  usa o subtotal de tabela, mesmo quando o desconto do cliente vence.
- **Admin nas funções:** reusa `public.is_admin()` da Fase 1. O
  `pedido_eventos` é gravado só dentro de `admin_atualizar_pedido`
  (security definer, `search_path = ''`).
- **Bloco de preço:**
  - componente cliente que chama `precos_cliente` com o client do
    navegador, para a página continuar ISR;
  - o carrinho e as páginas do cliente são dinâmicas, porque estão atrás do
    login.
- **Slug:**
  - gerado de `codigo + '-' + nome`, sem acentos, em minúsculas, com hífens;
  - se já existir, recebe `-2`, `-3`, e assim por diante;
  - o mesmo algoritmo no SQL do preenchimento inicial e no admin.
- **Cloudinary:**
  - manuais e imagens são públicos;
  - imagens usam o tipo de recurso `image` e PDFs usam `raw`, com
    assinaturas separadas.
- **Reenviar e-mails:** envia para o cliente e para a Nex. `notificado_em`
  só é preenchido se os dois envios derem certo.
- **Limite do formulário de contato:** é por instância, sem garantia
  (aceitável no plano gratuito). O honeypot é a proteção principal.

## Deixado para o builder
- A estrutura dos componentes, o tamanho da grade e o skeleton do bloco de
  preço.
- O formato exato do JSON de retorno de `simular_pedido`.
- O renderizador de markdown, que deve ser leve e sem HTML cru.
- O layout dos e-mails (HTML simples com fallback em texto).

## Para o usuário
- Na Vercel: adicionar `RESEND_API_KEY`, `EMAIL_PEDIDOS_DESTINO` (opcional)
  e as 3 variáveis do Cloudinary.
- Cadastrar os produtos pelo painel.
- Pendência legal: endereço físico no site (Decreto 7.962) e regra de
  devolução (CDC art. 49).
