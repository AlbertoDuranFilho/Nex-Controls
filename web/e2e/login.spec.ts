import { expect, test, type Page } from "@playwright/test";
import { contarAcessos, criarAdmin, criarLojista } from "./fixtures";

const ROTULOS = {
  pt: { email: "Email", senha: "Senha", entrar: "Entrar" },
  en: { email: "Email", senha: "Password", entrar: "Sign in" },
  es: { email: "Email", senha: "Contraseña", entrar: "Entrar" },
} as const;

async function preencherELogar(
  page: Page,
  cred: { email: string; senha: string },
  locale: keyof typeof ROTULOS = "pt",
) {
  const r = ROTULOS[locale];
  await page.getByLabel(r.email, { exact: true }).fill(cred.email);
  await page.getByLabel(r.senha, { exact: true }).fill(cred.senha);
  await page.getByRole("button", { name: r.entrar, exact: true }).click();
}

test("olho mostra e oculta a senha; link de contato vai ao formulário da home", async ({ page }) => {
  await page.goto("/pt/cliente/login");
  const senha = page.getByLabel("Senha", { exact: true });
  await expect(senha).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(senha).toHaveAttribute("type", "text");
  const ocultar = page.getByRole("button", { name: "Ocultar senha" });
  await expect(ocultar).toHaveAttribute("aria-pressed", "true");
  await ocultar.click();
  await expect(senha).toHaveAttribute("type", "password");
  await expect(page.getByRole("link", { name: "Fale conosco" })).toHaveAttribute("href", "/pt#contato");
});

test("lojista entra no catálogo e vê saudação", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
  await expect(page.locator("nav").first()).toContainText("Olá, Loja Teste");
});

test("senha errada mostra erro genérico", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, { email: u.email, senha: "errada-123" });
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await expect(page).toHaveURL("/pt/cliente/login");
});

test("lojista desativado consegue entrar", async ({ page }) => {
  const u = await criarLojista({ ativo: false });
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
});

test("rota protegida preserva idioma e destino", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/en/cliente/endereco");
  await expect(page).toHaveURL("/en/cliente/login?next=%2Fen%2Fcliente%2Fendereco");
  await preencherELogar(page, u, "en");
  await expect(page).toHaveURL("/en/cliente/endereco");
});

test("next externo é ignorado", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login?next=//evil.com");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
});

test("lojista não acessa admin", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
  await page.goto("/pt/admin/lojistas");
  await expect(page).toHaveURL("/pt/catalogo");
});

test("admin vai para o painel; admin em /es/cliente vai para /es/admin/lojistas", async ({
  page,
}) => {
  const a = await criarAdmin();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, a);
  // A página /admin/lojistas chega na Task 6: aqui só a URL importa.
  await expect(page).toHaveURL("/pt/admin/lojistas");
  await page.goto("/es/cliente");
  await expect(page).toHaveURL("/es/admin/lojistas");
});

test("sair encerra a sessão", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
  await page.getByRole("button", { name: /^Olá,/ }).click(); // abre o menu da conta
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/pt");
  await expect(page.locator("nav").first().getByRole("link", { name: "Entrar" })).toBeVisible();
  await page.goto("/pt/cliente");
  await expect(page).toHaveURL(/\/pt\/cliente\/login/);
});

test("login grava acessos_log", async ({ page }) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");
  expect(await contarAcessos(u.id)).toBe(1);
});

test.describe("menu mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sair no menu mobile encerra a sessão", async ({ page }) => {
    const u = await criarLojista();
    await page.goto("/pt/cliente/login");
    await preencherELogar(page, u);
    await expect(page).toHaveURL("/pt/catalogo");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/pt");
    await page.goto("/pt/cliente");
    await expect(page).toHaveURL(/\/pt\/cliente\/login/);
  });
});

test("token expirado com refresh válido renova a sessão no middleware", async ({
  page,
  context,
}) => {
  const u = await criarLojista();
  await page.goto("/pt/cliente/login");
  await preencherELogar(page, u);
  await expect(page).toHaveURL("/pt/catalogo");

  // Reescreve o cookie de sessão: access_token expirado, refresh_token intacto.
  const antes = await context.cookies();
  const partes = antes
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  expect(partes.length).toBeGreaterThan(0);
  const base = partes[0].name.replace(/\.\d+$/, "");
  const bruto = partes.map((c) => c.value).join("");
  expect(bruto.startsWith("base64-")).toBe(true);
  const sessao = JSON.parse(Buffer.from(bruto.slice(7), "base64url").toString());
  const accessAntigo: string = sessao.access_token;

  const exp = Math.floor(Date.now() / 1000) - 3600;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  sessao.access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, exp })}.assinatura-invalida`;
  sessao.expires_at = exp;
  sessao.expires_in = 0;
  const novo = "base64-" + Buffer.from(JSON.stringify(sessao)).toString("base64url");

  const modelo = partes[0];
  await context.clearCookies({ name: /^sb-.+-auth-token/ });
  const TAM = 3000;
  const pedacos = novo.match(new RegExp(`.{1,${TAM}}`, "g"))!;
  await context.addCookies(
    pedacos.map((valor, i) => ({
      name: pedacos.length === 1 ? base : `${base}.${i}`,
      value: valor,
      domain: modelo.domain,
      path: modelo.path,
      expires: modelo.expires,
      sameSite: modelo.sameSite,
    })),
  );

  await page.goto("/pt/cliente");
  await expect(page).toHaveURL("/pt/cliente");
  // Renderizado no servidor com o usuário renovado pelo middleware.
  await expect(page.getByTestId("area-cliente-nome")).toHaveText("Loja Teste");

  const depois = (await context.cookies()).filter((c) => /^sb-.+-auth-token/.test(c.name));
  const sessaoNova = JSON.parse(
    Buffer.from(
      depois
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((c) => c.value)
        .join("")
        .slice(7),
      "base64url",
    ).toString(),
  );
  expect(sessaoNova.access_token).not.toBe(accessAntigo);
  expect(sessaoNova.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
});
