import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { admin, criarAdmin, criarLojista, limparUsuarios, sql } from "./fixtures";

const CNPJ = "11.222.333/0001-81";
const CNPJ_DIGITOS = "11222333000181";
const DOMINIO = "e2e.nexcontrols.test";

const emailNovo = () => `cliente-${randomUUID()}@${DOMINIO}`;

async function entrar(page: Page, cred: { email: string; senha: string }) {
  await page.goto("/pt/cliente/login");
  await page.getByLabel("Email", { exact: true }).fill(cred.email);
  await page.getByLabel("Senha", { exact: true }).fill(cred.senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function loginAdmin(page: Page) {
  const a = await criarAdmin();
  await entrar(page, a);
  await expect(page).toHaveURL("/pt/admin/lojistas");
}

async function cadastrar(
  page: Page,
  d: { tipo?: "PF" | "PJ"; documento: string; nome: string; email: string; desconto?: string },
) {
  await page.goto("/pt/admin/lojistas/novo");
  await page.getByLabel("Tipo de pessoa").selectOption(d.tipo ?? "PJ");
  await page.getByLabel("CPF/CNPJ").fill(d.documento);
  await page.getByLabel("Nome ou razão social").fill(d.nome);
  await page.getByLabel("E-mail").fill(d.email);
  if (d.desconto) await page.getByLabel("Desconto (%)").fill(d.desconto);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
}

async function senhaGerada(page: Page) {
  const loc = page.getByTestId("senha-gerada");
  await expect(loc).toBeVisible();
  return (await loc.textContent())!.trim();
}

async function tentarLogin(browser: Browser, cred: { email: string; senha: string }) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await entrar(p, cred);
  return { p, ctx };
}

async function contagens() {
  const db = admin();
  const { count } = await db.from("lojistas").select("id", { count: "exact", head: true });
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return { lojistas: count, usuarios: data!.users.length };
}

test.afterEach(async () => {
  await limparUsuarios();
});

test("cria cliente PJ com documento formatado e senha aparece uma vez", async ({ page }) => {
  await loginAdmin(page);
  const email = emailNovo();
  await cadastrar(page, { documento: CNPJ, nome: "Loja Nova", email, desconto: "5,5" });
  const senha = await senhaGerada(page);
  expect(senha.length).toBeGreaterThanOrEqual(12);
  await expect(page.getByText("Esta senha não será exibida novamente")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("senha-gerada")).toHaveCount(0);

  const { data } = await admin()
    .from("lojistas")
    .select("desconto_percentual")
    .eq("email", email)
    .single();
  expect(Number(data!.desconto_percentual)).toBe(5.5);

  await page.goto("/pt/admin/lojistas?busca=Loja+Nova");
  const linha = page.getByRole("row").filter({ hasText: email });
  await expect(linha).toContainText(CNPJ);
  await expect(linha).toContainText("Ativo");
});

test("cliente criado consegue logar com a senha provisória", async ({ page, browser }) => {
  await loginAdmin(page);
  const email = emailNovo();
  await cadastrar(page, { documento: CNPJ, nome: "Loja Login", email });
  const senha = await senhaGerada(page);
  const { p, ctx } = await tentarLogin(browser, { email, senha });
  await expect(p).toHaveURL("/pt/cliente");
  await ctx.close();
});

test("documento duplicado mostra erro amigável", async ({ page }) => {
  await loginAdmin(page);
  await cadastrar(page, { documento: CNPJ, nome: "Loja A", email: emailNovo() });
  await senhaGerada(page);
  await cadastrar(page, { documento: CNPJ_DIGITOS, nome: "Loja B", email: emailNovo() });
  await expect(page.getByText("Já existe um cliente com este CPF/CNPJ.")).toBeVisible();
  await expect(page.getByTestId("senha-gerada")).toHaveCount(0);
});

test("e-mail duplicado não deixa órfão", async ({ page }) => {
  await loginAdmin(page);
  const existente = await criarLojista();
  const antes = await contagens();
  await cadastrar(page, { documento: CNPJ, nome: "Loja C", email: existente.email.toUpperCase() });
  await expect(page.getByText("Já existe um usuário com este e-mail.")).toBeVisible();
  expect(await contagens()).toEqual(antes);
});

test("CPF inválido é recusado", async ({ page }) => {
  await loginAdmin(page);
  const antes = await contagens();
  await cadastrar(page, {
    tipo: "PF",
    documento: "529.982.247-24",
    nome: "Pessoa",
    email: emailNovo(),
  });
  await expect(page.getByText(/CPF inválido.*dígito verificador/)).toBeVisible();
  expect(await contagens()).toEqual(antes);
});

test("desativar: cliente entra mas admin vê inativo", async ({ page, browser }) => {
  await loginAdmin(page);
  const email = emailNovo();
  await cadastrar(page, { documento: CNPJ, nome: "Loja Inativa", email });
  const senha = await senhaGerada(page);
  await page.getByRole("link", { name: "Ver cliente" }).click();
  await page.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByTestId("status-cliente")).toHaveText("Inativo");

  await page.goto("/pt/admin/lojistas?busca=Loja+Inativa");
  await expect(page.getByRole("row").filter({ hasText: email })).toContainText("Inativo");

  const { p, ctx } = await tentarLogin(browser, { email, senha });
  await expect(p).toHaveURL("/pt/cliente");
  await ctx.close();
});

test("gerar nova senha: senha antiga falha, nova funciona", async ({ page, browser }) => {
  await loginAdmin(page);
  const email = emailNovo();
  await cadastrar(page, { documento: CNPJ, nome: "Loja Senha", email });
  const antiga = await senhaGerada(page);
  await page.getByRole("link", { name: "Ver cliente" }).click();
  await page.getByRole("button", { name: "Gerar nova senha" }).click();
  const nova = await senhaGerada(page);
  expect(nova).not.toBe(antiga);

  const falha = await tentarLogin(browser, { email, senha: antiga });
  await expect(falha.p.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await falha.ctx.close();

  const ok = await tentarLogin(browser, { email, senha: nova });
  await expect(ok.p).toHaveURL("/pt/cliente");
  await ok.ctx.close();
});

test("anonimizar: login falha, CPF fica livre para novo cadastro", async ({ page, browser }) => {
  await loginAdmin(page);
  const email = emailNovo();
  await cadastrar(page, { documento: CNPJ, nome: "Loja Anonima", email });
  const senha = await senhaGerada(page);
  await page.getByRole("link", { name: "Ver cliente" }).click();
  await expect(page).toHaveURL(/\/pt\/admin\/lojistas\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;

  // O lojista entra antes: precisa existir uma sessão viva para provar a revogação.
  const viva = await tentarLogin(browser, { email, senha });
  await expect(viva.p).toHaveURL("/pt/cliente");
  const sessoesAntes = await sql("select 1 from auth.sessions where user_id = $1", [id]);
  expect(sessoesAntes.length).toBeGreaterThan(0);

  const botao = page.getByRole("button", { name: "Anonimizar", exact: true });
  await expect(botao).toBeDisabled();
  await page.getByLabel("Digite o CPF/CNPJ para confirmar").fill("00.000.000/0000-00");
  await expect(botao).toBeDisabled();
  await page.getByLabel("Digite o CPF/CNPJ para confirmar").fill(CNPJ_DIGITOS);
  await botao.click();
  await expect(page.getByTestId("status-cliente")).toHaveText("Anonimizado");

  const { data } = await admin().from("lojistas").select("*").eq("id", id).single();
  expect(data).toMatchObject({
    documento: null,
    nome: "Cliente anonimizado",
    ativo: false,
    telefone: null,
    email: `anonimizado-${id}@invalid`,
  });
  expect(data!.anonimizado_em).not.toBeNull();
  const pessoais = [
    "documento",
    "nome_fantasia",
    "inscricao_estadual",
    "responsavel_nome",
    "telefone",
    "whatsapp",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "uf",
  ] as const;
  for (const col of pessoais) {
    expect(data![col], col).toBeNull();
  }

  // Schema auth: banido, sem o e-mail antigo em lugar nenhum, sem sessões.
  const [usuario] = await sql<{ banned_until: Date | null; linha: string }>(
    "select banned_until, u::text as linha from auth.users u where id = $1",
    [id],
  );
  expect(usuario.banned_until).not.toBeNull();
  expect(usuario.banned_until!.getTime()).toBeGreaterThan(Date.now());
  expect(usuario.linha).not.toContain(email);
  const identidades = await sql<{ linha: string }>(
    "select i::text as linha from auth.identities i where user_id = $1",
    [id],
  );
  for (const i of identidades) expect(i.linha).not.toContain(email);
  expect(await sql("select 1 from auth.sessions where user_id = $1", [id])).toHaveLength(0);
  expect(await sql("select 1 from auth.audit_log_entries where payload::text like $1", [`%${email}%`])).toHaveLength(0);

  // A sessão que estava aberta foi revogada: recarregar a área do cliente cai no login.
  await viva.p.goto("/pt/cliente");
  await expect(viva.p).toHaveURL(/\/pt\/cliente\/login/);
  await viva.ctx.close();

  const { p, ctx } = await tentarLogin(browser, { email, senha });
  await expect(p.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await ctx.close();

  await cadastrar(page, { documento: CNPJ, nome: "Loja Nova Dona", email: emailNovo() });
  await senhaGerada(page);

  // O e-mail anonimizado não casa com o domínio de limpeza dos testes.
  await admin().from("lojistas").delete().eq("id", id);
  await admin().auth.admin.deleteUser(id);
});

test("editar: nome atualiza o app_metadata e documento fica somente leitura", async ({ page }) => {
  await loginAdmin(page);
  const l = await criarLojista();
  await page.goto(`/pt/admin/lojistas/${l.id}`);
  await expect(page.getByLabel("CPF/CNPJ", { exact: true })).toBeDisabled();
  await page.getByLabel("Nome ou razão social").fill("Loja Renomeada");
  await page.getByLabel("Telefone").fill("(11) 91234-5678");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  const { data } = await admin().auth.admin.getUserById(l.id);
  expect(data.user!.app_metadata.nome).toBe("Loja Renomeada");
  const { data: row } = await admin().from("lojistas").select("telefone").eq("id", l.id).single();
  expect(row!.telefone).toBe("11912345678");
});

test("app_metadata adulterado para admin sem is_admin não acessa o painel", async ({ page }) => {
  const l = await criarLojista();
  await admin().auth.admin.updateUserById(l.id, {
    app_metadata: { nome: "Loja Teste", papel: "admin" },
  });
  await entrar(page, l);
  // O login redireciona por app_metadata; o layout confere profiles.is_admin e expulsa.
  await expect(page).toHaveURL("/pt");
  await page.goto("/pt/admin/lojistas");
  await expect(page).toHaveURL("/pt");
  await expect(page.getByRole("heading", { name: "Clientes" })).toHaveCount(0);
  await page.goto("/pt/admin/lojistas/novo");
  await expect(page).toHaveURL("/pt");
});
