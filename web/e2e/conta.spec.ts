import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, criarLojista } from "./fixtures";

const MAILPIT = "http://127.0.0.1:54324/api/v1";

async function logar(page: Page, u: { email: string; senha: string }, locale = "pt") {
  await page.goto(`/${locale}/cliente/login`);
  await page.getByLabel(locale === "en" ? "Password" : "Senha", { exact: true }).fill(u.senha);
  await page.getByLabel("Email", { exact: true }).fill(u.email);
  await page
    .getByRole("button", { name: locale === "en" ? "Sign in" : "Entrar", exact: true })
    .click();
  // O login cai no catálogo; os testes daqui são sobre a página "Meus dados".
  await expect(page).toHaveURL(`/${locale}/catalogo`);
  await page.goto(`/${locale}/cliente`);
}

async function lojistaNoBanco(id: string) {
  const { data, error } = await admin().from("lojistas").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

test("documento e nome aparecem só leitura", async ({ page }) => {
  const u = await criarLojista({ nome: "Loja Leitura" });
  const db = await lojistaNoBanco(u.id);
  await logar(page, u);

  const doc = page.getByLabel("CPF/CNPJ", { exact: true });
  await expect(doc).toBeDisabled();
  const d = db.documento!;
  const esperado = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  await expect(doc).toHaveValue(esperado);

  const nome = page.getByLabel("Nome ou razão social", { exact: true });
  await expect(nome).toBeDisabled();
  await expect(nome).toHaveValue("Loja Leitura");
  await expect(page.getByTestId("area-cliente-nome")).toHaveText("Loja Leitura");
});

test("salva dados e mostra Salvo", async ({ page }) => {
  const u = await criarLojista();
  await logar(page, u);

  await page.getByLabel("Telefone", { exact: true }).fill("(81) 99999-0000");
  await page.getByLabel("Nome do responsável", { exact: true }).fill("Maria Silva");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  expect((await lojistaNoBanco(u.id)).telefone).toBe("81999990000");

  await page.reload();
  await expect(page.getByLabel("Telefone", { exact: true })).toHaveValue("(81) 99999-0000");
  await expect(page.getByLabel("Nome do responsável", { exact: true })).toHaveValue("Maria Silva");
});

test("CEP preenche endereço", async ({ page }) => {
  await page.route("https://viacep.com.br/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        cep: "50030-230",
        logradouro: "Rua do Imperador Dom Pedro II",
        bairro: "Santo Antônio",
        localidade: "Recife",
        uf: "PE",
      }),
    }),
  );
  const u = await criarLojista();
  await logar(page, u);
  await page.goto("/pt/cliente/endereco");

  await page.getByLabel("CEP", { exact: true }).fill("50030230");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Rua do Imperador Dom Pedro II",
  );
  await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue("Santo Antônio");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Recife");
  await expect(page.getByLabel("UF", { exact: true })).toHaveValue("PE");
  await expect(page.getByLabel("Número", { exact: true })).toBeFocused();

  await page.getByLabel("Número", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  const db = await lojistaNoBanco(u.id);
  expect(db.cep).toBe("50030230");
  expect(db.cidade).toBe("Recife");
  expect(db.uf).toBe("PE");
  expect(db.numero).toBe("100");
});

test("ViaCEP fora do ar não bloqueia", async ({ page }) => {
  await page.route("https://viacep.com.br/**", (route) => route.abort());
  const u = await criarLojista();
  await logar(page, u);
  await page.goto("/pt/cliente/endereco");

  await page.getByLabel("CEP", { exact: true }).fill("50030-230");
  await expect(page.getByText("Não encontramos o CEP, preencha manualmente.")).toBeVisible();

  await page.getByLabel("Logradouro", { exact: true }).fill("Rua Manual");
  await page.getByLabel("Número", { exact: true }).fill("5");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await page.getByLabel("Cidade", { exact: true }).fill("Olinda");
  await page.getByLabel("UF", { exact: true }).selectOption("PE");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  const db = await lojistaNoBanco(u.id);
  expect(db.logradouro).toBe("Rua Manual");
  expect(db.cidade).toBe("Olinda");
});

test("troca de e-mail pede confirmação nos dois", async ({ page }) => {
  const u = await criarLojista();
  const novo = `novo-${randomUUID()}@e2e.nexcontrols.test`;
  await logar(page, u);

  await page.getByLabel("Novo e-mail", { exact: true }).fill(novo);
  await page.getByRole("button", { name: "Alterar e-mail", exact: true }).click();
  await expect(page.getByText(/aguardando confirmação nos dois e-mails/i)).toBeVisible();
  await expect(page.getByText(novo, { exact: true })).toBeVisible();

  async function linkPara(destino: string): Promise<string> {
    let link = "";
    await expect
      .poll(
        async () => {
          const busca = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${destino}`)}`);
          const { messages } = (await busca.json()) as { messages: { ID: string }[] };
          if (!messages.length) return "";
          const msg = await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json();
          const m = String(msg.Text).match(/https?:\/\/\S+\/pt\/auth\/confirm\?\S+/);
          link = m ? m[0] : "";
          return link;
        },
        { timeout: 15_000 },
      )
      .not.toBe("");
    return link;
  }

  const linkAntigo = await linkPara(u.email);
  const linkNovo = await linkPara(novo);

  async function emailNoAuth() {
    const { data, error } = await admin().auth.admin.getUserById(u.id);
    if (error) throw error;
    return data.user.email;
  }

  // Primeiro link: só um lado confirmado. O e-mail antigo continua valendo em todo lugar.
  await page.goto(linkAntigo);
  await expect(page).toHaveURL(/\/pt\/cliente\?email=pendente$/);
  await expect(page.getByText("Primeiro link confirmado. Falta confirmar no outro e-mail.")).toBeVisible();
  expect(await emailNoAuth()).toBe(u.email);
  expect((await lojistaNoBanco(u.id)).email).toBe(u.email);

  // Segundo link: conclui a troca.
  await page.goto(linkNovo);
  await expect(page).toHaveURL(/\/pt\/cliente\?email=confirmado$/);
  await expect(page.getByText("E-mail alterado com sucesso.")).toBeVisible();
  await expect(page.getByText(novo, { exact: true })).toBeVisible();
  expect(await emailNoAuth()).toBe(novo);
  expect((await lojistaNoBanco(u.id)).email).toBe(novo);

  await page.getByRole("button", { name: "Sair" }).click();
  // Espera o Sair terminar: senão a página /cliente recarrega para login?next=/pt/cliente.
  await expect(page).toHaveURL("/pt");
  await logar(page, { email: novo, senha: u.senha });
});

test("senha oculta com flag desligada", async ({ page }) => {
  test.skip(process.env.FEATURE_TROCA_SENHA === "true", "flag ligada neste ambiente");
  const u = await criarLojista();
  await logar(page, u);
  await expect(page.getByRole("link", { name: "Segurança" })).toHaveCount(0);
  const resposta = await page.goto("/pt/cliente/seguranca");
  expect(resposta?.status()).toBe(404);
});

test("tela em inglês", async ({ page }) => {
  const u = await criarLojista();
  await logar(page, u, "en");
  await expect(page.getByRole("heading", { name: "My details" })).toBeVisible();
});

// Roda só com FEATURE_TROCA_SENHA=true (a flag é lida no servidor, no build/start).
test("senha com flag ligada: aparece Segurança e troca a senha", async ({ page }) => {
  test.skip(process.env.FEATURE_TROCA_SENHA !== "true", "flag desligada neste ambiente");
  const u = await criarLojista();
  await logar(page, u);
  await page.getByRole("link", { name: "Segurança" }).click();
  await expect(page).toHaveURL("/pt/cliente/seguranca");

  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha#456");
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("OutraSenha#789");
  await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
  await expect(page.getByText("As senhas não conferem.")).toBeVisible();

  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("NovaSenha#456");
  await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
  await expect(page.getByText("Senha alterada", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/pt");
  await logar(page, { email: u.email, senha: "NovaSenha#456" });
});
