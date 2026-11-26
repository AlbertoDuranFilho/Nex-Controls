import { describe, expect, it } from "vitest";
import { parseDecimal, validarProduto } from "./produto";

function form(c: Record<string, string>) {
  const f = new FormData();
  f.set("codigo", "P1");
  f.set("nome", "N");
  for (const [k, v] of Object.entries(c)) f.set(k, v);
  return f;
}

describe("parseDecimal", () => {
  it.each([["189,90", 189.9], ["189.90", 189.9], ["1.234,56", 1234.56], ["0", 0], ["", null]])(
    "%s",
    (entrada, esperado) => expect(parseDecimal(entrada)).toBe(esperado),
  );
  it.each(["-1", "abc", "1,2,3"])("recusa %s", (e) => expect(parseDecimal(e)).toBeNaN());
});

describe("validarProduto", () => {
  it.each([
    [{ cest: "123456" }, "CEST inválido: informe 7 dígitos."],
    [{ ean: "123456789" }, "EAN inválido: informe 8, 12, 13 ou 14 dígitos."],
    [{ origem: "9" }, "Origem inválida: informe um número de 0 a 8."],
    [{ slug: "Ruim Slug" }, "Slug inválido: use letras minúsculas, números e hífens (ex.: placa-rele-24v)."],
    [{ manual_url: "http://x.com/a.pdf" }, "O link do manual deve começar com https://."],
    [{ preco: "-5" }, "Preço inválido: informe um valor maior ou igual a 0."],
  ])("%j", (campos, msg) => {
    expect(validarProduto(form(campos))).toEqual({ ok: false, erro: msg });
  });
});
