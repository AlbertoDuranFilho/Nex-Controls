import { describe, expect, it } from "vitest";
import { formatarDocumento, validarDocumento } from "@/lib/validacao/documento";

describe("validarDocumento", () => {
  it("aceita CPF válido com máscara e retorna apenas dígitos", () => {
    expect(validarDocumento("PF", "529.982.247-25")).toEqual({ ok: true, documento: "52998224725" });
  });

  it("ignora espaços ao redor do CPF", () => {
    expect(validarDocumento("PF", " 52998224725 ")).toEqual({ ok: true, documento: "52998224725" });
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(validarDocumento("PF", "529.982.247-24")).toEqual({ ok: false, erro: "digito" });
  });

  it("rejeita CPF com sequência repetida", () => {
    expect(validarDocumento("PF", "111.111.111-11")).toEqual({ ok: false, erro: "digito" });
  });

  it("aceita CNPJ válido com máscara", () => {
    expect(validarDocumento("PJ", "11.222.333/0001-81")).toEqual({ ok: true, documento: "11222333000181" });
  });

  it("rejeita CPF informado como CNPJ por formato", () => {
    expect(validarDocumento("PJ", "52998224725")).toEqual({ ok: false, erro: "formato" });
  });
});

describe("formatarDocumento", () => {
  it("formata CNPJ com 14 dígitos", () => {
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formata CPF com 11 dígitos", () => {
    expect(formatarDocumento("12345678909")).toBe("123.456.789-09");
  });
});
