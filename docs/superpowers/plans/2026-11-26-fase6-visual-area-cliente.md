# Fase 6 — Visual da área do cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Área do cliente bonita e moderna: login dividido, cliente cai no catálogo em cartões com preço e "adicionar ao carrinho", ícones em todo lugar, bordas arredondadas, hover.

**Architecture:** Componentes de UI reutilizáveis (`web/components/ui/`), ícones `lucide-react`, tokens no `globals.css`. Sem mudança de banco. Preços da lista vêm de uma única chamada `precos_cliente(uuid[])` no cliente (mesma regra da ilha `PrecoProduto`).

**Tech Stack:** Next.js 15, Tailwind 4 (tokens `marca-*`), next-intl (pt/en/es), lucide-react, Playwright.

**Spec (pedido do usuário, 2026-11-26):** tela de login como a da referência Alado (lado esquerdo escuro com logo, cartão à direita, cantos bem arredondados), com a logo Nex e a paleta preta/branca premium (memória do projeto: design preto e branco, luxo). "A primeira página que tem que aparecer é o catálogo de produtos em cards, sempre tudo muito bonito, bordas arredondadas, use ícones; na senha use ícones de olho (olho cortado ao mostrar); coloque hover." Referência de mercado: Dufrio (cartões com código em etiqueta, preço em destaque, busca/ordenação, breadcrumb). O usuário ainda vai mandar exemplos de lista de produtos e ícones — fazer algo coerente que seja fácil de ajustar.

## Global Constraints
- Paleta: só tokens `marca-*` (preto, branco, cinzas). Cores de status só nos selos de pedido (tons suaves: âmbar aguardando, azul pago, violeta faturado, ciano enviado, verde entregue, vermelho cancelado, cinza devolvido), com texto legível (contraste AA).
- Raios: cartões `rounded-2xl`, campos/botões `rounded-xl`, selos `rounded-full`. Sombras suaves (`shadow-sm` → `hover:shadow-lg`).
- Ícones: `lucide-react` (versão exata fixada no package.json), `aria-hidden` quando decorativos; botões só-ícone com `aria-label`.
- Animações: `transition` 150–300 ms; respeitar `motion-reduce:` (sem translate/zoom).
- Textos novos nas 3 línguas (`web/messages/{pt,en,es}.json`); admin continua só pt e fora do escopo visual.
- Acessibilidade: nomes acessíveis existentes que os e2e usam devem continuar iguais, salvo quando o texto mudar de propósito (aí atualize o e2e na mesma task). Foco visível (`focus-visible:ring`).
- Mobile: tudo funciona em 360 px; sem rolagem horizontal.
- Nenhuma regra de negócio muda (preço, carrinho, pedido, permissões). Admin redireciona como hoje.
- Todos os testes continuam verdes: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `CI=true npx playwright test` (51 passed + 1 skipped hoje).

## Review Focus
- Visitante no catálogo não vê preço nem botão de carrinho (vê "Entre para ver preços"); admin também não compra.
- Lojista inativo / produto sem preço: cartão mostra "Sob consulta", sem botão de adicionar.
- Catálogo com 0 produtos, produto sem imagem e nomes longos não quebram o grid.
- Login com `?next=` continua indo ao destino; sem `next`, lojista vai ao catálogo.
- Contador do carrinho no topo atualiza depois de adicionar pelo cartão.

---

### Task 1: Base visual (ícones, UI) e tela de login

**Files:** `web/package.json` (+ lock), `web/src/app/globals.css`, Create `web/components/ui/Botao.tsx`, `web/components/ui/Selo.tsx`, `web/components/ui/CampoSenha.tsx`; Modify `web/components/LoginForm.tsx`, `web/src/app/[locale]/cliente/login/page.tsx`, `web/messages/*.json`, `web/lib/redirect.ts` (+ teste).

**Interfaces (Produces):**
- `Botao` — props `{ variante?: "primario" | "secundario" | "fantasma"; tamanho?: "sm" | "md" | "lg"; icone?: LucideIcon; href?: string; carregando?: boolean } & ButtonHTMLAttributes` (renderiza `Link` quando `href`). Primário: preto/branco, hover cinza-800, `active:scale-[.98]`.
- `Selo` — `{ tom?: "neutro" | "ambar" | "azul" | "violeta" | "ciano" | "verde" | "vermelho"; icone?: LucideIcon; children }`.
- `CampoSenha` — input de senha com botão ícone `Eye`/`EyeOff`, `aria-label` "Mostrar senha"/"Ocultar senha" (traduzido; mantém as chaves `mostrarSenha`/`ocultarSenha`), `aria-pressed`.
- `destinoSeguro(next, locale)` — padrão passa a ser `/${locale}/catalogo`.

- [ ] Instalar `lucide-react` (versão exata). Login: duas colunas ≥ md (esquerda: degradê preto→grafite, logo branca — `logo.svg` com `brightness-0 invert` ou equivalente —, frase curta de marca; direita: cartão `rounded-3xl` branco com rótulo "ÁREA DO CLIENTE", título "Boas-vindas", subtítulo, campos `rounded-xl` com ícones `Mail`/`Lock`, `CampoSenha`, botão "Entrar" com `LogIn`, link "Ainda não é cliente? Fale conosco" → `/${locale}#contato`, link "Voltar ao site"). Mobile: faixa escura com logo no topo, cartão abaixo.
- [ ] Teste de `destinoSeguro` atualizado; e2e de login ajustados só onde o destino padrão mudou. Tudo verde. Commit.

### Task 2: Catálogo em cartões com preço e carrinho

**Files:** `web/components/ProductCard.tsx`, `web/components/catalogo/BuscaCatalogo.tsx`, Create `web/components/catalogo/PrecosCatalogo.tsx` (contexto client que busca `precos_cliente` para os ids da lista numa chamada e expõe estado por produto), `web/components/catalogo/AdicionarAoCarrinho.tsx` (quantidade com `Minus`/`Plus` + botão `ShoppingCart`), `web/src/app/[locale]/catalogo/page.tsx`, `web/src/app/[locale]/catalogo/[slug]/page.tsx`, `web/components/ProdutoDetalhe.tsx`, `web/components/catalogo/PrecoProduto.tsx` (reusar `AdicionarAoCarrinho`), `web/components/CatalogoSection.tsx` (home), messages, e2e do catálogo.

- [ ] Cartão: `rounded-2xl`, área de imagem quadrada com fundo cinza-50 e `object-contain`, zoom leve no hover; selo do código; nome (2 linhas, `line-clamp-2`); preço final em destaque + preço de tabela riscado e selo "-X%" quando houver desconto; `AdicionarAoCarrinho` para lojista com preço; "Sob consulta" sem preço; visitante: "Entre para ver preços" (link ao login com `next` = catálogo); admin: sem compra. Cartão inteiro clicável para o detalhe (sem aninhar `<a>` com botões — use link no nome/imagem). Hover: `-translate-y-1 shadow-lg`. Skeleton enquanto carrega preços.
- [ ] Página do catálogo: breadcrumb (Início › Catálogo) com ícone `Home`, título, busca com ícone `Search` e botão limpar `X`, contagem "N produtos", ordenação (nome A–Z, código), grid 2 colunas no mobile → 4 no desktop, estado vazio com ícone `PackageSearch`.
- [ ] Ao adicionar: feedback no botão (`Check` "Adicionado") e evento para o `IconeCarrinho` atualizar o contador (ver como ele atualiza hoje).
- [ ] Detalhe do produto: galeria `rounded-2xl`, especificações em tabela arredondada, bloco de preço com o mesmo `AdicionarAoCarrinho`, manual com ícone `FileText`.
- [ ] e2e: visitante não vê preço nos cartões; lojista adiciona pelo cartão e o contador muda. Tudo verde. Commit.

### Task 3: Topo, menu da conta, carrinho e pedidos

**Files:** `web/components/Navbar.tsx`, `web/components/MenuUsuario.tsx`, `web/components/carrinho/IconeCarrinho.tsx`, `web/components/conta/NavConta.tsx`, `web/src/app/[locale]/cliente/(area)/layout.tsx` e páginas (`page.tsx`, `carrinho`, `pedidos`, `pedidos/[numero]`, `endereco`, `seguranca`), `web/components/carrinho/*`, messages, e2e afetados.

- [ ] Navbar: ícones `ShoppingCart` com contador em selo redondo, menu do usuário com `User`, itens com ícones (`LayoutGrid` Catálogo, `Package` Pedidos, `UserCog` Minha conta, `LogOut` Sair); hover/foco; mobile ok.
- [ ] NavConta: primeiro item "Catálogo" (`LayoutGrid`, leva a `/${locale}/catalogo`), depois Carrinho (`ShoppingCart`), Pedidos (`Package`), Meus dados (`User`), Endereço (`MapPin`), Segurança (`ShieldCheck`, só com flag); item ativo em pílula preta `rounded-xl`; mobile: abas roláveis com ícone.
- [ ] Carrinho: itens em cartões `rounded-2xl` com miniatura, stepper `Minus`/`Plus`, remover `Trash2`, resumo em cartão fixo (sticky no desktop) com ícone de cupom `TicketPercent`, botão "Gerar pedido" com `ClipboardCheck`; estado vazio com `ShoppingCart` e botão para o catálogo.
- [ ] Pedidos: lista em cartões com número, data, total e `Selo` de status com ícone (Clock aguardando, BadgeCheck pago, FileText faturado, Truck enviado, PackageCheck entregue, XCircle cancelado, Undo2 devolvido); detalhe com linha do tempo vertical de eventos com ícones, itens e link da nota com `FileDown`.
- [ ] Meus dados/Endereço: cartões arredondados, campos `rounded-xl`.
- [ ] e2e ajustados só onde o texto mudou de propósito. Tudo verde. Commit.
