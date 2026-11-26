import { describe, expect, it } from "vitest";
import { validarContato } from "./validar";

const base = { nome: "Maria Silva", email: "maria@loja.com", mensagem: "Quero um orçamento." };

describe("validarContato", () => {
  it("aceita dados válidos e apara os campos", () => {
    const r = validarContato({
      ...base,
      nome: "  Maria Silva ",
      telefone: " 11999 ",
      mensagem: "  Quero um orçamento.  ",
    });
    expect(r).toEqual({
      ok: true,
      dados: {
        nome: "Maria Silva",
        email: "maria@loja.com",
        telefone: "11999",
        mensagem: "Quero um orçamento.",
      },
    });
  });
  it("nome de 1 caractere dá erro em nome", () => {
    const r = validarContato({ ...base, nome: "M" });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.erros.nome).toBeTruthy();
  });
  it("e-mail inválido dá erro em email", () => {
    const r = validarContato({ ...base, email: "a@" });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.erros.email).toBeTruthy();
  });
  it("mensagem curta ou longa demais dá erro", () => {
    for (const mensagem of ["curta", "x".repeat(2001)]) {
      const r = validarContato({ ...base, mensagem });
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.erros.mensagem).toBeTruthy();
    }
  });
  it("honeypot preenchido retorna spam", () => {
    expect(validarContato({ ...base, empresa_site: "x" })).toEqual({ ok: "spam" });
  });
});
