import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, criarLojista, criarProduto, darDesconto, removerProdutos } from "./fixtures";

const SEGREDO = "e2e-revalidar";
const sufixo = randomUUID().slice(0, 8).toUpperCase();
const codigos: string[] = [];

// A lista e o detalhe são cacheados (ISR, 1h): invalida a tag como a Task 5 fará pelo admin.
async function novoProduto(dados: Parameters<typeof criarProduto>[0]) {
  codigos.push(dados.codigo);
  const p = await criarProduto(dados);
  const r = await fetch("http://localhost:3000/api/revalidar", {
    method: "POST",
    headers: { "x-revalidate-secret": SEGREDO },
  });
  expect(r.status).toBe(200);
  return p;
}

async function logar(page: Page, u: { email: string; senha: string }) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Senha", { exact: true }).fill(u.senha);
  await page.getByLabel("Email", { exact: true }).fill(u.email);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/pt/catalogo");
}

test.afterAll(async () => {
  await removerProdutos(codigos);
});

test("visitante vê o produto na lista e nenhum preço", async ({ page }) => {
  const nome = `Placa Visitante ${sufixo}`;
  await novoProduto({ codigo: `V${sufixo}`, nome, preco: 100 });
  await page.goto("/pt/catalogo");
  await expect(page.getByText(nome)).toBeVisible();
  const cartao = page.getByRole("article").filter({ hasText: nome });
  await expect(cartao.getByRole("link", { name: "Entre para ver preços" })).toHaveAttribute(
    "href",
    `/pt/cliente/login?next=${encodeURIComponent("/pt/catalogo")}`,
  );
  await expect(cartao.getByRole("button", { name: /carrinho/ })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("R$");
});

test("lojista adiciona pelo cartão e o contador do carrinho muda", async ({ page }) => {
  const u = await criarLojista();
  const nome = `Placa Cartao ${sufixo}`;
  await novoProduto({ codigo: `C${sufixo}`, nome, preco: 80 });
  await logar(page, u);
  await page.getByLabel("Buscar produto").fill(`C${sufixo}`);

  const cartao = page.getByRole("article").filter({ hasText: nome });
  await expect(cartao.getByText(/R\$\s80,00/)).toBeVisible();
  await expect(page.getByTestId("icone-carrinho")).toHaveAttribute("aria-label", "Carrinho: 0");

  await cartao.getByRole("button", { name: `Aumentar quantidade de ${nome}` }).click();
  await expect(cartao.getByLabel(`Quantidade de ${nome}`, { exact: true })).toHaveValue("2");
  await cartao.getByRole("button", { name: `Adicionar ${nome} ao carrinho` }).click();
  await expect(cartao.getByRole("button", { name: `Adicionar ${nome} ao carrinho` })).toContainText(
    "Adicionado",
  );
  await expect(page.getByTestId("icone-carrinho")).toHaveAttribute("aria-label", "Carrinho: 2");
});

test("produto sem preço aparece como sob consulta no cartão, sem botão de adicionar", async ({ page }) => {
  const u = await criarLojista();
  const nome = `Placa Consulta ${sufixo}`;
  const { id } = await novoProduto({ codigo: `S${sufixo}`, nome, preco: 10 });
  const { error } = await admin().from("produto_precos").delete().eq("produto_id", id);
  expect(error).toBeNull();
  await logar(page, u);

  const cartao = page.getByRole("article").filter({ hasText: nome });
  await expect(cartao.getByText("Sob consulta")).toBeVisible();
  await expect(cartao.getByRole("button", { name: /ao carrinho/ })).toHaveCount(0);
});

test("detalhe mostra especificação e link do manual; sem preço para visitante", async ({ page }) => {
  const manual = "https://res.cloudinary.com/demo/raw/upload/manual.pdf";
  const { slug } = await novoProduto({
    codigo: `D${sufixo}`,
    nome: `Placa Detalhe ${sufixo}`,
    preco: 100,
    manual_url: manual,
    especificacoes: [{ nome: "Tensão", valor: "24 V" }],
  });
  await page.goto(`/pt/catalogo/${slug}`);
  await page.getByRole("button", { name: "Especificações Técnicas" }).click();
  await expect(page.getByText("Tensão")).toBeVisible();
  await expect(page.getByText("24 V")).toBeVisible();
  await expect(page.getByRole("link", { name: /Baixar Manual/ })).toHaveAttribute("href", manual);
  await expect(page.getByRole("link", { name: /Entrar para ver o preço/ })).toHaveAttribute(
    "href",
    `/pt/cliente/login?next=${encodeURIComponent(`/pt/catalogo/${slug}`)}`,
  );
  await expect(page.locator("main")).not.toContainText("R$");
});

test("produto inexistente dá 404", async ({ page }) => {
  const r = await page.goto("/pt/catalogo/nao-existe-" + sufixo.toLowerCase());
  expect(r?.status()).toBe(404);
});

test("lojista com 10% vê preço riscado, adiciona 2 e o carrinho mostra 2", async ({ page }) => {
  const u = await criarLojista();
  const { id, slug } = await novoProduto({
    codigo: `L${sufixo}`,
    nome: `Placa Lojista ${sufixo}`,
    preco: 100,
  });
  await darDesconto(u.id, id, 10);
  await logar(page, u);
  await page.goto(`/pt/catalogo/${slug}`);

  await expect(page.getByTestId("preco-final")).toContainText(/R\$\s90,00/);
  await expect(page.getByTestId("preco-tabela")).toContainText(/R\$\s100,00/);

  await page.getByLabel("Quantidade").fill("2");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("Adicionado ao carrinho")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver carrinho" })).toBeVisible();
  await expect(page.getByTestId("icone-carrinho")).toContainText("2");
});

test("lojista desativado vê aviso de conta inativa", async ({ page }) => {
  const u = await criarLojista({ ativo: false });
  const { slug } = await novoProduto({
    codigo: `I${sufixo}`,
    nome: `Placa Inativa ${sufixo}`,
    preco: 100,
  });
  await logar(page, u);
  await page.goto(`/pt/catalogo/${slug}`);
  await expect(page.getByText(/conta.*inativa/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toHaveCount(0);
});

test("quantidade 0 desabilita o botão e não chama a action", async ({ page }) => {
  const u = await criarLojista();
  const { slug } = await novoProduto({
    codigo: `Q${sufixo}`,
    nome: `Placa Quantidade ${sufixo}`,
    preco: 50,
  });
  await logar(page, u);
  await page.goto(`/pt/catalogo/${slug}`);

  const acoes: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.headers()["next-action"]) acoes.push(req.url());
  });

  const botao = page.getByRole("button", { name: "Adicionar ao carrinho" });
  await expect(botao).toBeEnabled();
  await page.getByLabel("Quantidade").fill("0");
  await expect(botao).toBeDisabled();
  await botao.click({ force: true });
  await page.getByLabel("Quantidade").fill("10000");
  await expect(botao).toBeDisabled();
  await page.waitForTimeout(500);
  expect(acoes).toHaveLength(0);
});
