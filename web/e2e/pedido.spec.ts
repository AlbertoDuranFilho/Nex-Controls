import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  colocarNoCarrinho,
  criarCupom,
  criarLojista,
  criarProduto,
  limparUsuarios,
  removerCupons,
  removerProdutos,
  sql,
} from "./fixtures";

const sufixo = randomUUID().slice(0, 6).toUpperCase();
const cupomValor = `C30V${sufixo}`;
const cupomPercentual = `C5P${sufixo}`;
const cupomMinimo = `MIN${sufixo}`;
const codigos: string[] = [];
let seq = 0;

async function logar(page: Page, u: { email: string; senha: string }) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(u.email);
  await page.getByLabel("Senha", { exact: true }).fill(u.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/pt/cliente");
}

// Lojista com 10% de desconto geral e 2× um produto de R$ 100 no carrinho.
async function cenario(page: Page, opcoes: { endereco?: boolean } = {}) {
  const u = await criarLojista({ desconto: 10, endereco: opcoes.endereco ?? true });
  const codigo = `PED${sufixo}${++seq}`;
  codigos.push(codigo);
  const nome = `Placa Pedido ${sufixo} ${seq}`;
  const p = await criarProduto({ codigo, nome, preco: 100 });
  await colocarNoCarrinho(u.id, p.id, 2);
  await logar(page, u);
  await page.goto("/pt/cliente/carrinho");
  return { u, p, nome };
}

async function aplicarCupom(page: Page, codigo: string) {
  await page.getByLabel("Cupom", { exact: true }).fill(codigo.toLowerCase());
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
}

test.beforeAll(async () => {
  await criarCupom({ codigo: cupomValor, tipo: "valor", valor: 30 });
  await criarCupom({ codigo: cupomPercentual, tipo: "percentual", valor: 5 });
  await criarCupom({ codigo: cupomMinimo, tipo: "valor", valor: 50, valor_minimo_pedido: 150 });
});

test.afterAll(async () => {
  await limparUsuarios(); // remove também os pedidos de teste
  await removerCupons([cupomValor, cupomPercentual, cupomMinimo]);
  await removerProdutos(codigos);
});

test("vale o maior: desconto do cliente, cupom maior e cupom pior", async ({ page }) => {
  await cenario(page);
  const total = page.getByTestId("total");
  await expect(total).toContainText(/R\$\s180,00/);
  await expect(page.getByText("Frete: a combinar")).toBeVisible();

  await aplicarCupom(page, cupomValor);
  await expect(total).toContainText(/R\$\s170,00/);
  await expect(page.getByTestId("linha-desconto")).toContainText(`cupom ${cupomValor}`);

  await aplicarCupom(page, cupomPercentual);
  await expect(page.getByTestId("mensagem-cupom")).toContainText("Seu desconto atual já é maior");
  await expect(total).toContainText(/R\$\s180,00/);
  await expect(page.getByTestId("linha-desconto")).toContainText("Seu desconto");
});

test("cupom com mínimo fica inválido quando a quantidade cai", async ({ page }) => {
  const { nome } = await cenario(page);
  const total = page.getByTestId("total");
  await aplicarCupom(page, cupomMinimo);
  await expect(total).toContainText(/R\$\s150,00/);

  const qtd = page.getByLabel(`Quantidade de ${nome}`);
  await qtd.fill("1");
  await qtd.press("Enter");
  await expect(page.getByTestId("mensagem-cupom")).toContainText(/R\$\s150,00/);
  await expect(page.getByTestId("mensagem-cupom")).toContainText(/mínimo/);
  await expect(total).toContainText(/R\$\s90,00/);
  await expect(page.getByRole("button", { name: "Gerar pedido" })).toBeDisabled();
});

test("quantidade 0 é recusada e o valor anterior fica", async ({ page }) => {
  const { u, nome } = await cenario(page);
  const qtd = page.getByLabel(`Quantidade de ${nome}`);
  await qtd.fill("0");
  await qtd.press("Enter");
  await expect(page.getByText("Informe uma quantidade de 1 a 9999.")).toBeVisible();
  await expect(qtd).toHaveValue("2");
  await expect(page.getByTestId("total")).toContainText(/R\$\s180,00/);
  const linhas = await sql<{ quantidade: number }>(
    "select quantidade from public.carrinho_itens where lojista_id = $1",
    [u.id],
  );
  expect(linhas.map((l) => l.quantidade)).toEqual([2]);
});

test("remover item recalcula e esvazia o carrinho", async ({ page }) => {
  const { nome } = await cenario(page);
  await page.getByRole("button", { name: `Remover ${nome}` }).click();
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
  await expect(page.getByTestId("icone-carrinho")).toContainText("0");
});

test("gerar pedido: redireciona, grava notificado_em e esvazia o carrinho", async ({ page }) => {
  const { u } = await cenario(page);
  await page.getByLabel("Observação").fill("<b>entregar de manhã</b>");
  await expect(page.getByText("24/500")).toBeVisible();
  await page.getByRole("button", { name: "Gerar pedido" }).click();
  await expect(page).toHaveURL(/\/pt\/cliente\/pedidos\/\d+\?novo=1$/);

  const pedidos = await sql<{ numero: string; notificado_em: Date | null; observacao: string; total: string }>(
    "select numero, notificado_em, observacao, total from public.pedidos where lojista_id = $1",
    [u.id],
  );
  expect(pedidos).toHaveLength(1);
  expect(pedidos[0].notificado_em).not.toBeNull();
  expect(pedidos[0].observacao).toBe("<b>entregar de manhã</b>");
  expect(Number(pedidos[0].total)).toBe(180);
  expect(page.url()).toContain(`/pedidos/${pedidos[0].numero}?novo=1`);

  const carrinho = await sql("select 1 from public.carrinho_itens where lojista_id = $1", [u.id]);
  expect(carrinho).toHaveLength(0);
});

test("lojista sem endereço vê o aviso e o botão desabilitado", async ({ page }) => {
  await cenario(page, { endereco: false });
  await expect(page.getByText(/Cadastre seu endereço de entrega/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Cadastrar endereço" })).toHaveAttribute(
    "href",
    "/pt/cliente/endereco",
  );
  await expect(page.getByRole("button", { name: "Gerar pedido" })).toBeDisabled();
});
