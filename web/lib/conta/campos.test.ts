import { describe, expect, it } from "vitest";
import { lerCampos, localeValido, mascaraCep, mascaraTelefone, UFS, ufValida } from "./campos";

describe("mascaras", () => {
  it("telefone de 11 e 10 dígitos", () => {
    expect(mascaraTelefone("81999990000")).toBe("(81) 99999-0000");
    expect(mascaraTelefone("8133334444")).toBe("(81) 3333-4444");
    expect(mascaraTelefone("(81) 9")).toBe("(81) 9");
    expect(mascaraTelefone(null)).toBe("");
  });
  it("cep", () => {
    expect(mascaraCep("50030230")).toBe("50030-230");
    expect(mascaraCep("500")).toBe("500");
  });
});

describe("validação", () => {
  it("tem as 27 UFs", () => {
    expect(UFS).toHaveLength(27);
    expect(ufValida("PE")).toBe(true);
    expect(ufValida("XX")).toBe(false);
  });
  it("locale cai em pt", () => {
    expect(localeValido("en")).toBe("en");
    expect(localeValido("fr")).toBe("pt");
    expect(localeValido(null)).toBe("pt");
  });
  it("lerCampos faz trim, rejeita não-string e limite", () => {
    const f = new FormData();
    f.set("a", "  oi  ");
    f.set("b", "x".repeat(11));
    f.set("c", new Blob(["x"]), "arq.txt");
    const r = lerCampos(f, { a: 10, b: 10, c: 10, d: 10 });
    expect(r.valores).toEqual({ a: "oi", b: "x".repeat(11), c: "", d: "" });
    expect(r.problemas).toEqual({ b: "longo", c: "tipo" });
  });
});
