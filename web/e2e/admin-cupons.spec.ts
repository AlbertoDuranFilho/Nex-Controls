import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, criarAdmin, criarLojista, criarProduto, limparUsuarios, removerProdutos } from "./fixtures";

const sufixo = randomUUID().slice(0, 6).toUpperCase();
const codigoCupom = `NATAL${sufixo}`;
const codigoProduto = `CUP${sufixo}`;

async function entrar(page: Page, cred: { email: string; senha: string }) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(cred.email);
  await page.getByLabel("Senha", { exact: true }).fill(cred.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/pt/admin");
}

test.afterEach(async () => {
  await admin().from("cupons").delete().eq("codigo", codigoCupom);
  await removerProdutos([codigoProduto]);
  await limparUsuarios();
});

test("admin cria cupom, vê 0 / ilimitado e desativa", async ({ page }) => {
  await entrar(page, await criarAdmin());
  await page.goto("/pt/admin/cupons");
  await page.getByRole("link", { name: "Novo cupom" }).click();
  await page.getByLabel("Código", { exact: true }).fill(codigoCupom.toLowerCase());
  await page.getByLabel("Valor", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Salvar cupom" }).click();
  await expect(page).toHaveURL(/\/pt\/admin\/cupons\/[0-9a-f-]{36}$/);

  await page.goto("/pt/admin/cupons");
  const linha = page.getByRole("row", { name: new RegExp(codigoCupom) });
  await expect(linha).toContainText("10%");
  await expect(linha).toContainText("0 / ilimitado");
  await expect(linha).toContainText("Ativo");

  await linha.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByRole("row", { name: new RegExp(codigoCupom) })).toContainText("Inativo");
});

test("admin define 15% para um produto na página do lojista", async ({ page }) => {
  const lojista = await criarLojista();
  await criarProduto({ codigo: codigoProduto, nome: `Placa ${sufixo}`, preco: 100 });
  await entrar(page, await criarAdmin());
  await page.goto(`/pt/admin/lojistas/${lojista.id}`);
  await page.getByLabel("Produto", { exact: true }).selectOption({ label: `${codigoProduto} — Placa ${sufixo}` });
  await page.getByLabel("Desconto do produto (%)").fill("15");
  await page.getByRole("button", { name: "Definir desconto" }).click();
  const linha = page.getByRole("row", { name: new RegExp(codigoProduto) });
  await expect(linha).toContainText("15%");

  await linha.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByRole("row", { name: new RegExp(codigoProduto) })).toHaveCount(0);
});

test("lista de cupons em 1024 px e 360 px: ações alcançáveis e sem rolagem da página", async ({ page }) => {
  const lojista = await criarLojista();
  const { error } = await admin()
    .from("cupons")
    .insert({
      codigo: codigoCupom,
      tipo: "percentual",
      valor: 10,
      valido_de: "2026-01-01T10:00:00Z",
      valido_ate: "2026-12-31T10:00:00Z",
      max_usos: 100,
      lojista_id: lojista.id,
    });
  if (error) throw error;
  await entrar(page, await criarAdmin());

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/pt/admin/cupons");
  const linha = page.getByRole("row", { name: new RegExp(codigoCupom) });
  const editar = linha.getByRole("link", { name: "Editar" });
  await editar.scrollIntoViewIfNeeded();
  await expect(editar).toBeInViewport();
  await expect(linha.getByRole("button", { name: "Desativar" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);

  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/pt/admin/cupons");
  await expect(page.getByRole("row", { name: new RegExp(codigoCupom) })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
