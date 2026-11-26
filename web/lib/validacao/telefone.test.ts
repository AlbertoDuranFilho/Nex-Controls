import { describe, expect, it } from "vitest";
import { validarTelefone } from "@/lib/validacao/telefone";

describe("validarTelefone", () => {
  it("aceita celular com máscara e retorna apenas dígitos", () => {
    expect(validarTelefone("(81) 99999-0000")).toBe("81999990000");
  });

  it("rejeita DDD inválido (abaixo de 11)", () => {
    expect(validarTelefone("0899990000")).toBeNull();
  });

  it("rejeita quantidade de dígitos diferente de 10 ou 11", () => {
    expect(validarTelefone("8199999")).toBeNull();
  });
});
