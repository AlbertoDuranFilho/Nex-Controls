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
import { URL_MAINO_FALSA, type Requisicao } from "./maino-falso";

const sufixo = randomUUID().slice(0, 6).toUpperCase();
const codigo = `NFE${sufixo}`;

async function logar(page: Page, u: { email: string; senha: string }, destino: string) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(u.email);
  await page.getByLabel("Senha", { exact: true }).fill(u.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(destino);
}

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
  await criarProduto({ codigo, nome: `Placa NF-e ${sufixo}`, preco: 100 });
});

test.afterAll(async () => {
  await limparUsuarios();
  await removerProdutos([codigo]);
});

test("admin envia, emite e autoriza a NF-e pela Mainô falsa", async ({ browser, request }) => {
  const lojista = await criarLojista({ endereco: true });
  const numero = await criarPedido(lojista);

  const ctxAdmin = await browser.newContext();
  const a = await ctxAdmin.newPage();
  await logar(a, await criarAdmin(), "/pt/admin/lojistas");
  await a.goto(`/pt/admin/pedidos/${numero}`);

  // Antes de Pago não há ação de NF-e.
  await expect(a.getByRole("heading", { name: "Nota fiscal (Mainô)" })).toBeVisible();
  await expect(a.getByRole("button", { name: "Enviar para a Mainô" })).toHaveCount(0);

  await a.getByLabel("Status", { exact: true }).selectOption("pago");
  await a.getByRole("button", { name: "Salvar" }).click();
  await expect(a.getByText("Pedido atualizado.")).toBeVisible();

  await a.getByRole("button", { name: "Enviar para a Mainô" }).click();
  await expect(a.getByRole("button", { name: "Emitir NF-e" })).toBeVisible();
  await expect(a.getByTestId("nfe-status")).toHaveText("Pedido enviado, nota não emitida");

  await a.getByRole("button", { name: "Emitir NF-e" }).click();
  await expect(a.getByTestId("nfe-status")).toHaveText("Em transmissão");
  await expect(a.getByRole("button", { name: "Atualizar situação" })).toBeVisible();

  // A Mainô autoriza a nota; o admin atualiza a situação.
  const [{ maino_pedido_id }] = await sql<{ maino_pedido_id: string }>(
    "select maino_pedido_id from public.pedidos where numero = $1",
    [numero],
  );
  expect((await request.post(`${URL_MAINO_FALSA}/__autorizar/${maino_pedido_id}`)).ok()).toBe(true);
  await a.getByRole("button", { name: "Atualizar situação" }).click();

  await expect(a.getByTestId("nfe-status")).toHaveText("Autorizada");
  await expect(a.getByRole("heading", { name: new RegExp(`Pedido #${numero} — Faturado`) })).toBeVisible();
  await expect(a.getByRole("link", { name: "DANFE (PDF)" })).toHaveAttribute(
    "href",
    `https://maino.test/danfe/${maino_pedido_id}.pdf`,
  );
  await expect(a.getByRole("button", { name: "Cancelar NF-e" })).toBeVisible();
  await expect(a.getByRole("button", { name: "Emitir NF-e" })).toHaveCount(0);

  // A Mainô recebeu o pedido com numero SITE-<n> e itens com código.
  const reqs = (await (await request.get(`${URL_MAINO_FALSA}/__requisicoes`)).json()) as Requisicao[];
  const criacao = reqs.find((r) => r.metodo === "POST" && r.caminho.startsWith("/api/v2/pedidos?"));
  expect(criacao?.autorizado).toBe(true);
  const corpo = JSON.stringify(criacao?.corpo);
  expect(corpo).toContain(`"numero":"SITE-${numero}"`);
  expect(corpo).toContain(`"codigo":"${codigo}"`);
  expect(reqs.some((r) => r.metodo === "POST" && r.caminho === `/api/v2/pedidos/${maino_pedido_id}/nota_fiscal`)).toBe(true);
  await ctxAdmin.close();

  // Área do cliente: link da nota e status Faturado.
  const ctxCliente = await browser.newContext();
  const c = await ctxCliente.newPage();
  await logar(c, lojista, "/pt/cliente");
  await c.goto(`/pt/cliente/pedidos/${numero}`);
  await expect(c.getByTestId("status-pedido")).toHaveText("Faturado");
  await expect(c.getByRole("link", { name: /nota fiscal/i })).toHaveAttribute(
    "href",
    `https://maino.test/danfe/${maino_pedido_id}.pdf`,
  );
  await ctxCliente.close();
});
