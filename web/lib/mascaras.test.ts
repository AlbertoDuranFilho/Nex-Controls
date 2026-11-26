import { describe, expect, it } from "vitest";
import { parseDesconto } from "@/lib/admin/formulario";
import { parseDecimal } from "@/lib/admin/produto";
import { somenteDigitos, validarDocumento } from "@/lib/validacao/documento";
import {
  mascaraCep,
  mascaraDecimal,
  mascaraDocumento,
  mascaraPercentual,
  mascaraTelefone,
  posicaoAposMascara,
  tipoPorDocumento,
} from "./mascaras";

describe("mascaraDocumento", () => {
  it("CPF até 11 dígitos", () => {
    expect(mascaraDocumento("")).toBe("");
    expect(mascaraDocumento("123")).toBe("123");
    expect(mascaraDocumento("1234")).toBe("123.4");
    expect(mascaraDocumento("1234567")).toBe("123.456.7");
    expect(mascaraDocumento("52998224725")).toBe("529.982.247-25");
  });

  it("CNPJ de 12 a 14 dígitos", () => {
    expect(mascaraDocumento("112223330001")).toBe("11.222.333/0001");
    expect(mascaraDocumento("1122233300018")).toBe("11.222.333/0001-8");
    expect(mascaraDocumento("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("colado já formatado e com sobra", () => {
    expect(mascaraDocumento("11.222.333/0001-81")).toBe("11.222.333/0001-81");
    expect(mascaraDocumento("529.982.247-25")).toBe("529.982.247-25");
    expect(mascaraDocumento("112223330001819")).toBe("11.222.333/0001-81");
    expect(mascaraDocumento(null)).toBe("");
  });

  it("o servidor recebe os mesmos dígitos", () => {
    const r = validarDocumento("PJ", somenteDigitos(mascaraDocumento("11222333000181")));
    expect(r).toEqual({ ok: true, documento: "11222333000181" });
  });
});

describe("tipoPorDocumento", () => {
  it("decide só com 11 ou 14 dígitos", () => {
    expect(tipoPorDocumento("529.982.247-25")).toBe("PF");
    expect(tipoPorDocumento("11.222.333/0001-81")).toBe("PJ");
    expect(tipoPorDocumento("123")).toBeNull();
    expect(tipoPorDocumento("112223330001")).toBeNull();
  });
});

describe("mascaraTelefone e mascaraCep", () => {
  it("telefone fixo e celular", () => {
    expect(mascaraTelefone("8133334444")).toBe("(81) 3333-4444");
    expect(mascaraTelefone("81999990000")).toBe("(81) 99999-0000");
    expect(mascaraTelefone("(81) 9")).toBe("(81) 9");
    expect(mascaraTelefone("+55 (81) 99999-0000 ramal")).toBe("(55) 81999-9900");
  });

  it("CEP", () => {
    expect(mascaraCep("50030230")).toBe("50030-230");
    expect(mascaraCep("50030-2301")).toBe("50030-230");
    expect(mascaraCep("500")).toBe("500");
  });
});

describe("mascaraDecimal", () => {
  it("vírgula decimal com até 2 casas", () => {
    expect(mascaraDecimal("189,9")).toBe("189,9");
    expect(mascaraDecimal("189,999")).toBe("189,99");
    expect(mascaraDecimal("abc12")).toBe("12");
    expect(mascaraDecimal("")).toBe("");
  });

  it("ponto vira vírgula; com vírgula o ponto é milhar", () => {
    expect(mascaraDecimal("189.90")).toBe("189,90");
    expect(mascaraDecimal("1.234,56")).toBe("1234,56");
    expect(mascaraDecimal("1,2,3")).toBe("1,23");
  });

  it("o servidor lê o mesmo número", () => {
    expect(parseDecimal(mascaraDecimal("1.234,56"))).toBe(1234.56);
    expect(parseDecimal(mascaraDecimal("189.90"))).toBe(189.9);
  });
});

describe("mascaraPercentual", () => {
  it("0 a 100 com até 2 casas", () => {
    expect(mascaraPercentual("12,5")).toBe("12,5");
    expect(mascaraPercentual("12,555")).toBe("12,55");
    expect(mascaraPercentual("5.5")).toBe("5,5");
    expect(mascaraPercentual("150")).toBe("100");
    expect(mascaraPercentual("100,5")).toBe("100");
    expect(mascaraPercentual("05")).toBe("5");
    expect(mascaraPercentual(",5")).toBe("0,5");
    expect(mascaraPercentual("5,")).toBe("5,");
    expect(mascaraPercentual("12%")).toBe("12");
    expect(mascaraPercentual("")).toBe("");
  });

  it("o servidor aceita o resultado", () => {
    for (const v of ["12,5", "100", "0,5", "", "7"]) expect(parseDesconto(mascaraPercentual(v))).not.toBeNull();
  });
});

describe("posicaoAposMascara", () => {
  it("mantém o cursor depois do mesmo dígito", () => {
    // "123.4|" digitando o 5 no fim: "123.45" → "123.45"
    expect(posicaoAposMascara("123.45", 6, "123.45")).toBe(6);
    // Digitou "9" depois do "1" em "123.456.7": "1923.456.7" (cursor 2) → "192.345.67"
    expect(posicaoAposMascara("1923.456.7", 2, "192.345.67")).toBe(2);
    // Cursor depois do 4º dígito atravessa o ponto inserido
    expect(posicaoAposMascara("1234", 4, "123.4")).toBe(5);
    expect(posicaoAposMascara("abc", 0, "")).toBe(0);
  });
});
