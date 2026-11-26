import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { criarAdmin, criarLojista, limparUsuarios, removerProdutos } from "./fixtures";

const sufixo = randomUUID().slice(0, 8).toUpperCase();
const codigos: string[] = [];
const MANUAL = "https://res.cloudinary.com/demo/raw/upload/manual.pdf";

async function entrar(page: Page, cred: { email: string; senha: string }) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(cred.email);
  await page.getByLabel("Senha", { exact: true }).fill(cred.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test.afterEach(async () => {
  await removerProdutos(codigos);
  await limparUsuarios();
});

test("admin cria produto com preço, especificação e manual; aparece na lista e o lojista vê o preço", async ({
  page,
  browser,
}) => {
  const codigo = `ADM1${sufixo}`;
  codigos.push(codigo);
  await entrar(page, await criarAdmin());
  await expect(page).toHaveURL("/pt/admin");

  await page.getByRole("link", { name: "Produtos", exact: true }).click();
  await page.getByRole("link", { name: "Novo produto" }).click();
  await page.getByLabel("Código", { exact: true }).fill(codigo);
  await page.getByLabel("Nome", { exact: true }).fill(`Placa Admin ${sufixo}`);
  await page.getByLabel("Preço de tabela (R$)").fill("250,00");
  await page.getByRole("button", { name: "Adicionar especificação" }).click();
  await page.getByLabel("Nome da especificação 1").fill("Tensão");
  await page.getByLabel("Valor da especificação 1").fill("24 V");
  await page.getByLabel("URL do manual").fill(MANUAL);
  await page.getByRole("button", { name: "Salvar produto" }).click();

  await expect(page).toHaveURL(/\/pt\/admin\/produtos\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("URL do manual")).toHaveValue(MANUAL);
  await expect(page.getByLabel("Valor da especificação 1")).toHaveValue("24 V");

  const urlEdicao = page.url();
  const slug = await page.getByLabel("Slug (URL)").inputValue();
  expect(slug).toContain(codigo.toLowerCase());

  await page.goto(`/pt/admin/produtos?busca=${codigo}`);
  const linha = page.getByRole("row", { name: new RegExp(codigo) });
  await expect(linha).toContainText(`Placa Admin ${sufixo}`);
  await expect(linha).toContainText("Ativo");

  const lojista = await criarLojista();
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await entrar(p, lojista);
  await expect(p).toHaveURL("/pt/catalogo");
  await p.goto(`/pt/catalogo/${slug}`);
  await expect(p.locator("main")).toContainText(/R\$\s250,00/);
  // Lista e detalhe agora estão no cache (ISR); a edição do admin tem de invalidar a tag.
  await p.goto("/pt/catalogo");
  await expect(p.getByText(`Placa Admin ${sufixo}`)).toBeVisible();

  await page.goto(urlEdicao);
  await page.getByLabel("Nome", { exact: true }).fill(`Placa Editada ${sufixo}`);
  await page.getByLabel("Preço de tabela (R$)").fill("300,00");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Produto salvo." })).toBeVisible();

  await p.goto("/pt/catalogo");
  await expect(p.getByText(`Placa Editada ${sufixo}`)).toBeVisible();
  await expect(p.getByText(`Placa Admin ${sufixo}`)).toHaveCount(0);
  await p.goto(`/pt/catalogo/${slug}`);
  await expect(p.getByRole("heading", { name: `Placa Editada ${sufixo}` })).toBeVisible();
  await expect(p.locator("main")).toContainText(/R\$\s300,00/);
  await ctx.close();
});

test("mostra erro de validação em português e mantém o que foi digitado", async ({ page }) => {
  await entrar(page, await criarAdmin());
  await expect(page).toHaveURL("/pt/admin");
  await page.goto("/pt/admin/produtos/novo");
  await page.getByLabel("Código", { exact: true }).fill(`ADM2${sufixo}`);
  await page.getByLabel("Nome", { exact: true }).fill("Qualquer");
  await page.getByLabel("NCM").fill("8537109");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "NCM inválido" })).toBeVisible();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Qualquer");
});
