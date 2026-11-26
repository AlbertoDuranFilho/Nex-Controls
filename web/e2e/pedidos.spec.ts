import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import {
  colocarNoCarrinho,
  criarAdmin,
  criarLojista,
  criarProduto,
  limparUsuarios,
  removerProdutos,
  sql,
} from "./fixtures";

const sufixo = randomUUID().slice(0, 6).toUpperCase();
const codigo = `PDS${sufixo}`;
const nomeProduto = `Placa Pedidos ${sufixo}`;
const NOTA = "https://exemplo.com/nf.pdf";

async function logar(page: Page, u: { email: string; senha: string }, destino: string) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(u.email);
  await page.getByLabel("Senha", { exact: true }).fill(u.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(destino);
}

// Cria o pedido pela RPC com a sessão do próprio lojista.
async function criarPedido(u: { id: string; email: string; senha: string }) {
  const produto = await sql<{ id: string }>("select id from public.produtos where codigo = $1", [codigo]);
  await colocarNoCarrinho(u.id, produto[0].id, 2);
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: e1 } = await c.auth.signInWithPassword({ email: u.email, password: u.senha });
  if (e1) throw e1;
  const { error } = await c.rpc("criar_pedido", {});
  if (error) throw error;
  const r = await sql<{ numero: string }>("select numero from public.pedidos where lojista_id = $1", [u.id]);
  return Number(r[0].numero);
}

test.beforeAll(async () => {
  await criarProduto({ codigo, nome: nomeProduto, preco: 100 });
});

test.afterAll(async () => {
  await limparUsuarios();
  await removerProdutos([codigo]);
});

test("cliente e admin acompanham o pedido até 'Pago' com nota", async ({ browser }) => {
  const lojista = await criarLojista({ endereco: true });
  const outro = await criarLojista({ endereco: true });
  const numero = await criarPedido(lojista);

  // Lojista: lista e detalhe
  const ctxCliente = await browser.newContext();
  const cliente = await ctxCliente.newPage();
  await logar(cliente, lojista, "/pt/catalogo");
  await cliente.goto("/pt/cliente/pedidos");
  // Cartão da lista: o link "Pedido #N" identifica o pedido.
  const linha = cliente
    .getByRole("listitem")
    .filter({ has: cliente.getByRole("link", { name: new RegExp(`#${numero}$`) }) });
  await expect(linha).toContainText("Aguardando pagamento");
  await linha.getByRole("link", { name: new RegExp(`#${numero}\\b`) }).click();
  await expect(cliente).toHaveURL(new RegExp(`/pt/cliente/pedidos/${numero}$`));
  await expect(cliente.getByText(nomeProduto)).toBeVisible();
  await expect(cliente.getByText("Recebemos seu pedido")).toHaveCount(0);

  await cliente.goto(`/pt/cliente/pedidos/${numero}?novo=1`);
  await expect(cliente.getByText(/Recebemos seu pedido\. A Nex entrará em contato/)).toBeVisible();

  // Outro lojista: não encontrado
  const ctxOutro = await browser.newContext();
  const intruso = await ctxOutro.newPage();
  await logar(intruso, outro, "/pt/catalogo");
  await intruso.goto(`/pt/cliente/pedidos/${numero}`);
  await expect(intruso.getByText(nomeProduto)).toHaveCount(0);
  await expect(intruso.getByText(/não encontrad|not found|404/i).first()).toBeVisible();
  await ctxOutro.close();

  // Admin
  const adm = await criarAdmin();
  const ctxAdmin = await browser.newContext();
  const a = await ctxAdmin.newPage();
  await logar(a, adm, "/pt/admin");
  await a.goto("/pt/admin/pedidos");
  await a.getByLabel("Status", { exact: true }).selectOption("aguardando_pagamento");
  await a.getByRole("button", { name: "Filtrar" }).click();
  const linhaAdmin = a.getByRole("row", { name: new RegExp(`#${numero}\\b`) });
  await expect(linhaAdmin).toContainText("Aguardando pagamento");
  await linhaAdmin.getByRole("link", { name: new RegExp(`#${numero}\\b`) }).click();
  await expect(a).toHaveURL(new RegExp(`/pt/admin/pedidos/${numero}$`));

  const select = a.getByLabel("Status", { exact: true });
  await expect(select.locator("option", { hasText: "Entregue" })).toHaveCount(0);
  await expect(select.locator("option", { hasText: "Pago" })).toHaveCount(1);
  await select.selectOption("pago");
  await a.getByLabel("Link da nota").fill(NOTA);
  await a.getByRole("button", { name: "Salvar" }).click();
  await expect(a.getByText("Pedido atualizado.")).toBeVisible();
  // Linha do tempo igual à do cliente: "Pedido criado" + a mudança para Pago.
  await expect(a.getByTestId("historico").getByRole("listitem")).toHaveCount(2);
  await expect(a.getByTestId("historico")).toContainText("Aguardando pagamento → Pago por");
  await expect(a.getByTestId("historico")).toContainText("Admin Teste");
  await ctxAdmin.close();

  // Lojista vê "Pago" e o link
  await cliente.goto(`/pt/cliente/pedidos/${numero}`);
  await expect(cliente.getByTestId("status-pedido")).toHaveText("Pago");
  await expect(cliente.getByRole("link", { name: /nota fiscal/i })).toHaveAttribute("href", NOTA);
  await ctxCliente.close();
});

test("link da nota sem https é recusado", async ({ browser }) => {
  const lojista = await criarLojista({ endereco: true });
  const numero = await criarPedido(lojista);
  const adm = await criarAdmin();
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  await logar(a, adm, "/pt/admin");
  await a.goto(`/pt/admin/pedidos/${numero}`);
  await a.getByLabel("Link da nota").fill("http://exemplo.com/nf.pdf");
  await a.getByRole("button", { name: "Salvar" }).click();
  await expect(a.getByText("O link da nota precisa começar com https://.")).toBeVisible();
  await ctx.close();
});

test("lista de pedidos em 1024 px e 360 px: colunas alcançáveis e sem rolagem da página", async ({ page }) => {
  const lojista = await criarLojista({ endereco: true });
  const numero = await criarPedido(lojista);
  await logar(page, await criarAdmin(), "/pt/admin");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/pt/admin/pedidos");
  const linha = page.getByRole("row", { name: new RegExp(`#${numero}$|#${numero} `) });
  const ultima = linha.getByRole("cell").last();
  await ultima.scrollIntoViewIfNeeded();
  await expect(ultima).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);

  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/pt/admin/pedidos");
  await expect(page.getByRole("row", { name: new RegExp(`#${numero}$|#${numero} `) })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
