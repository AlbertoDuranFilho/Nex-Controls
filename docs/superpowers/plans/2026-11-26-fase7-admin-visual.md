# Fase 7 — Visual do painel admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Painel admin com o mesmo padrão premium da área do cliente: barra lateral preta fixa, cartões arredondados, ícones, selos de status e uma página Início com resumo.

**Architecture:** Shell próprio do admin em `web/src/app/[locale]/admin/layout.tsx` (sidebar + conteúdo); o topo e o rodapé do site somem em `/…/admin`. Reusa `web/components/ui/{Botao,Selo,Campo,LogoNex,Esqueleto}`. Nenhuma regra de negócio muda.

**Tech Stack:** Next.js 15 (App Router), Tailwind 4 (tokens `marca-*`), lucide-react 1.70.0, Playwright.

**Spec (pedido do usuário, 2026-11-26):** "a segunda imagem [admin de Produtos] vc não mudou o visual né? … não gostei muito desse menu". Escolheu, entre três opções mostradas, a **barra lateral preta**: menu fixo à esquerda, fundo preto, logo Nex no topo, ícones (Início, Clientes, Produtos, Cupons, Pedidos com contagem de pedidos novos), embaixo "Ver site" e "Sair"; no celular vira gaveta. Listas em cartão arredondado com busca com lupa, miniatura do produto, selo de status (ex.: "● Ativo"), botões "Importar" e "+ Novo". Mesma linguagem visual da área do cliente (fase 6).

## Global Constraints
- Admin só em português (textos fixos, sem `messages/*.json`).
- Paleta só `marca-*`; cores fora dela só no `Selo` (status de pedido usa o mapeamento já existente em `StatusPedido`/`Selo`; ativo = `verde`, inativo = `neutro`).
- Raios: cartões `rounded-2xl`, campos/botões `rounded-xl`, selos `rounded-full`. Sombras `shadow-suave`/`shadow-elevada`. Foco visível `focus-visible:ring-2`. `motion-reduce:` respeitado.
- Ícones `lucide-react` com `aria-hidden` quando decorativos; botões só-ícone com `aria-label`.
- Nomes acessíveis que os e2e usam continuam iguais (rótulos de campos, "Buscar", "Editar", "Salvar", "Novo produto", "Importar planilha", nomes dos links do menu "Clientes"/"Produtos"/"Cupons"/"Pedidos" etc.), salvo mudança proposital com o e2e atualizado na mesma task.
- Segurança intacta: o layout e cada página continuam chamando `ehAdmin()`; nada de dado de admin em componente client sem checagem server.
- 360 px sem rolagem horizontal (tabelas largas: virar cartões empilhados no celular ou `overflow-x-auto` dentro do cartão).
- Tudo verde: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `CI=true npx playwright test` (hoje 56 passed + 1 skipped). Lockfile, se mexer em dependências: `npx -y npm@10 install --package-lock-only --ignore-scripts` (não deve ser preciso).

## Review Focus
- Em `/pt/admin/*` o topo e o rodapé do site não aparecem; no resto do site continuam iguais.
- Gaveta do celular: abre/fecha por botão com `aria-expanded`, fecha com Esc e ao navegar.
- Item ativo do menu correto também em subpáginas (`/admin/produtos/123` destaca Produtos).
- Contagem de pedidos novos: só `aguardando_pagamento`; sem pedidos, sem selo.
- Lista vazia, nome longo e produto sem imagem não quebram o layout.

---

### Task 1: Shell do admin (barra lateral) e página Início

**Files:** Modify `web/src/app/[locale]/admin/layout.tsx`, `web/components/Navbar.tsx`, `web/src/app/[locale]/layout.tsx`; Create `web/components/admin/MenuAdmin.tsx` (client: links, ativo por `usePathname`, gaveta mobile), `web/components/OcultarNoAdmin.tsx` (client: `usePathname`, devolve `null` quando o caminho é `/{locale}/admin` ou começa com `/{locale}/admin/`), `web/src/app/[locale]/admin/page.tsx` (Início); serviço de contagem em `web/services/` (reaproveite `pedidos-admin.ts`/`lojistas`/`produtos-admin` se já houver função; senão crie `resumoAdmin()` server-only com `count: "exact", head: true`); onde o admin é redirecionado depois do login (procure `admin/lojistas` em `web/lib` e `web/src`: destino padrão do admin passa a `/${locale}/admin`; o redirect da área do cliente para admin também); e2e que esperam `/pt/admin/lojistas` após login.

- [ ] `Navbar` não renderiza em rotas admin; `Footer` é envolvido por `OcultarNoAdmin` no layout raiz.
- [ ] Layout admin: `ehAdmin()` como hoje; sidebar preta `w-64` fixa ≥ lg (logo `LogoNex clara`, itens `LayoutDashboard` Início, `Users` Clientes, `Package` Produtos, `TicketPercent` Cupons, `Receipt` Pedidos + selo com nº de `aguardando_pagamento` quando > 0; rodapé do menu: `ExternalLink` "Ver site" → `/${locale}`, `LogOut` "Sair" usando a mesma ação de sair do `MenuUsuario`). Item ativo: pílula branca com texto preto; hover `bg-marca-branco/10`. `<nav aria-label="Administração">` mantido. Abaixo de lg: barra superior preta com logo e botão `Menu` (aria-label "Abrir menu", `aria-expanded`) que abre a gaveta (overlay, fecha com Esc, clique fora e ao trocar de rota). Conteúdo: fundo `marca-cinza-50`, `max-w-6xl`, padding confortável.
- [ ] Início (`/admin`): título "Início", saudação curta; 3–4 cartões de número com ícone (Pedidos aguardando pagamento → link para `/admin/pedidos?status=aguardando_pagamento`, Clientes, Produtos ativos, Cupons ativos); cartão "Últimos pedidos" (5 mais recentes: número, cliente, total, selo de status, link) com estado vazio.
- [ ] e2e: admin cai em `/pt/admin` após login; teste novo: menu lateral mostra os 5 itens, topo do site ausente em `/pt/admin`, Produtos ativo em `/pt/admin/produtos/novo`; 360 px abre a gaveta. Tudo verde. Commit.

### Task 2: Listas (Clientes, Produtos, Cupons, Pedidos)

**Files:** `web/src/app/[locale]/admin/{lojistas,produtos,cupons,pedidos}/page.tsx`, componentes admin usados nas listas (`BotaoCupomAtivo` etc.), possivelmente um `web/components/admin/CabecalhoAdmin.tsx` (título + descrição + ações) e `BuscaAdmin.tsx` (form GET com ícone `Search`, mantém `name`/label/botão "Buscar"); e2e afetados.

- [ ] Cabeçalho padrão: título, subtítulo cinza, ações com `Botao` (`Upload` "Importar planilha" secundário, `Plus` "Novo produto"/"Novo cliente"/"Novo cupom" primário).
- [ ] Busca/filtro em cartão: campo `rounded-xl` com lupa; filtro de status de pedidos como `select` arredondado (ou pílulas), mantendo `name="status"` e o rótulo "Status".
- [ ] Tabelas dentro de cartão `rounded-2xl` branco com `ring-1`, cabeçalho cinza claro, linhas com hover `bg-marca-cinza-50`; produto com miniatura 40 px (`object-contain`, ícone `ImageOff` se não tiver) — use `miniaturasProdutos` de `services/catalogo.ts` ou o campo de imagem que a lista já tiver; status com `Selo` (Ativo verde / Inativo neutro; pedidos com o selo de status da fase 6); ação "Editar" como botão fantasma com `Pencil` (nome acessível "Editar" mantido). No celular (< md), linhas viram cartões empilhados.
- [ ] Estado vazio com ícone (`PackageSearch`, `Users`, `TicketPercent`, `Receipt`) e texto atual ("Nenhum produto encontrado." etc. mantidos).
- [ ] e2e ajustados só se texto mudou de propósito. Tudo verde. Commit.

### Task 3: Formulários e detalhes

**Files:** `web/src/app/[locale]/admin/**/{novo,[id],[numero],importar}/page.tsx`, `web/components/admin/{FormProduto,FormLojista,FormCupom,DescontosProduto,AcoesLojista,AcoesPedido,ImportarPlanilha,PainelNfe,SenhaGerada,UploadCloudinary}.tsx`; e2e afetados.

- [ ] Páginas de formulário: link de volta (`ArrowLeft` "Voltar para …"), título, formulário em cartões `rounded-2xl` por seção (ex.: Produto: Dados, Imagens, Manual, Descontos), campos com `Campo` de `components/ui` ou mesmas classes (`rounded-xl`, foco preto), botões com `Botao` (`Save` "Salvar", `carregando`). Rótulos e nomes de botões iguais.
- [ ] Detalhe do pedido admin: cabeçalho com número + `Selo` de status, grid 2/3 + 1/3 (itens e totais | cliente, endereço, ações, NF-e), linha do tempo com ícones igual à do cliente (reuse o componente da fase 6 se existir).
- [ ] Importar planilha: zona de arquivo arredondada com `FileSpreadsheet`, link do modelo com `Download`, resultado em cartão com selos.
- [ ] `PainelNfe`, `SenhaGerada`, `AcoesLojista`, `AcoesPedido`, `BotaoCupomAtivo`: botões `Botao`, mensagens em caixas arredondadas.
- [ ] **Máscaras e placeholders (pedido do usuário, 2026-11-26)** — criar `web/lib/mascaras.ts` (funções puras + testes Vitest) e usar nos formulários do admin **e** da área do cliente (`web/components/conta/*`):
  - CPF/CNPJ num campo só que se identifica pelo tamanho: até 11 dígitos → `000.000.000-00`, 12–14 → `00.000.000/0000-00`; ao colar já formatado funciona; o envio continua mandando só dígitos (a validação atual em `lib/validacao/documento.ts` não muda). No cadastro de cliente, o "Tipo de pessoa" é escolhido sozinho pelo tamanho (o usuário ainda pode trocar). Placeholder `000.000.000-00 ou 00.000.000/0000-00`. (CNPJ alfanumérico continua pendente à parte.)
  - Telefone/WhatsApp: `(00) 0000-0000` / `(00) 00000-0000` conforme o tamanho; placeholder `(81) 99999-9999`.
  - Desconto (%): só números com até 2 casas, 0–100, sufixo `%` visível dentro do campo; placeholder `0`.
  - E-mail: `type="email"`, `autoComplete`, `inputMode="email"`, placeholder `nome@empresa.com.br`.
  - CEP `00000-000`, preços em R$ com placeholder `0,00` onde existir; IE com placeholder.
  - `inputMode="numeric"` nos campos numéricos (teclado certo no celular). Rótulos e `name` iguais (e2e).
- [ ] **Cursor de mão em tudo que é clicável** (Tailwind 4 tirou o padrão): em `globals.css`, `@layer base` com `button, [role="button"], select, summary, label[for], input[type=checkbox|radio|file|submit|button] { cursor: pointer }` e `:disabled, [aria-disabled="true"] { cursor: not-allowed }`. Vale para o site inteiro.
- [ ] **Login sem topo e rodapé do site** (recomendado e aceito): em `/[locale]/cliente/login` o `Navbar` e o `Footer`/`CookieConsent` não aparecem (mesmo mecanismo do admin); a tela já tem logo e "Voltar ao site". Ajustar o `pt-24` da página. e2e: login sem navbar; "Voltar ao site" leva à home.
- [ ] e2e ajustados só se texto mudou de propósito. Tudo verde. Commit.
