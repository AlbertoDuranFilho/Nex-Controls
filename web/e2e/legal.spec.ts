import { expect, test } from "@playwright/test";

const EMAIL = "contato@nexcontrols.com";

test("rodape legal identifica a empresa", async ({ page }) => {
  await page.goto("/pt");
  const rodape = page.locator("footer");
  await expect(rodape).toContainText("Nex Controls do Brasil LTDA");
  await expect(rodape).toContainText("CNPJ: 61.697.615/0001-03 · IE: 1261377-06");
  await expect(rodape).toContainText("TODO_ENDERECO");
  await expect(rodape).toContainText(EMAIL);
});

const politicas = [
  { locale: "pt", titulo: "CADASTRO E COMPRAS", retencao: "5 anos", log: "6 meses" },
  { locale: "en", titulo: "REGISTRATION AND PURCHASES", retencao: "5 years", log: "6 months" },
  { locale: "es", titulo: "REGISTRO Y COMPRAS", retencao: "5 años", log: "6 meses" },
];

for (const p of politicas) {
  test(`politica de privacidade (${p.locale}) cobre cadastro e compras`, async ({ page }) => {
    await page.goto(`/${p.locale}/privacy-policy`);
    const corpo = page.locator("body");
    await expect(page.getByRole("heading", { name: new RegExp(p.titulo) })).toBeVisible();
    await expect(corpo).toContainText(EMAIL);
    await expect(corpo).toContainText("Nex Controls do Brasil LTDA");
    await expect(corpo).toContainText(p.retencao);
    await expect(corpo).toContainText(p.log);
    await expect(corpo).toContainText("sa-east-1");
  });
}
