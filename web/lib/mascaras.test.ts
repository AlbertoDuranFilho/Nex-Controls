import { describe, expect, it } from "vitest";
import { parseDesconto } from "@/lib/admin/formulario";
import { parseDecimal } from "@/lib/admin/produto";
import { somenteDigitos, validarDocumento } from "@/lib/validacao/documento";
import {
  ehMascaraDecimal,
  mascaraCep,
  mascaraDecimal,
  mascaraDocumento,
  mascaraPercentual,
  mascaraTelefone,
  posicaoAposMascara,
  semVirgulaFinal,
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
    // Código do país (12 ou 13 dígitos começando com 55) sai.
    expect(mascaraTelefone("+55 (81) 99999-0000")).toBe("(81) 99999-0000");
    expect(mascaraTelefone("+55 81 3333-4444")).toBe("(81) 3333-4444");
    expect(mascaraTelefone("(55) 99999-0000")).toBe("(55) 99999-0000");
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
    expect(mascaraDecimal("1,2,3")).toBe("12,3");
  });

  it("colado com milhar: o último separador só é decimal com 1 ou 2 dígitos depois", () => {
    expect(mascaraDecimal("1.234")).toBe("1234");
    expect(mascaraDecimal("12.345.678")).toBe("12345678");
    expect(mascaraDecimal("1,234.56")).toBe("1234,56");
    expect(mascaraDecimal("1.234.5")).toBe("1234,5");
    expect(mascaraDecimal("189.")).toBe("189,");
  });

  it("o servidor lê o mesmo número", () => {
    expect(parseDecimal(mascaraDecimal("1.234,56"))).toBe(1234.56);
    expect(parseDecimal(mascaraDecimal("1,234.56"))).toBe(1234.56);
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

// Simula o input: cada tecla entra (ou apaga) na posição do cursor, a máscara roda e o
// cursor vai para posicaoAposMascara — o mesmo que aplicarMascara faz no navegador.
type Campo = { valor: string; cursor: number };
function tecla(c: Campo, t: string, mascara: (v: string) => string): Campo {
  let antes: string;
  let cursor: number;
  if (t === "Backspace") {
    if (c.cursor === 0) return c;
    antes = c.valor.slice(0, c.cursor - 1) + c.valor.slice(c.cursor);
    cursor = c.cursor - 1;
  } else {
    antes = c.valor.slice(0, c.cursor) + t + c.valor.slice(c.cursor);
    cursor = c.cursor + t.length;
  }
  const valor = mascara(antes);
  return {
    valor,
    cursor: valor === antes ? cursor : posicaoAposMascara(antes, cursor, valor, ehMascaraDecimal(mascara)),
  };
}
function digitar(texto: string, mascara: (v: string) => string, inicio: Campo = { valor: "", cursor: 0 }): Campo {
  return [...texto].reduce((c, t) => tecla(c, t, mascara), inicio);
}

describe("digitação com cursor", () => {
  it("ponto como separador decimal", () => {
    expect(digitar("189.90", mascaraDecimal).valor).toBe("189,90");
    expect(digitar("189,90", mascaraDecimal).valor).toBe("189,90");
    expect(digitar("5.5", mascaraPercentual).valor).toBe("5,5");
    expect(digitar(",5", mascaraPercentual).valor).toBe("0,5");
    expect(digitar("12.5", mascaraPercentual)).toEqual({ valor: "12,5", cursor: 4 });
  });

  it("documento, telefone e CEP digitados do zero", () => {
    expect(digitar("52998224725", mascaraDocumento).valor).toBe("529.982.247-25");
    expect(digitar("11222333000181", mascaraDocumento).valor).toBe("11.222.333/0001-81");
    expect(digitar("81999990000", mascaraTelefone)).toEqual({ valor: "(81) 99999-0000", cursor: 15 });
    expect(digitar("50030230", mascaraCep).valor).toBe("50030-230");
  });

  it("apagar no meio mantém o cursor no lugar", () => {
    // "529.98|2.247-25": apaga o 8 → "529.922.472-5", cursor depois do "9".
    const doc = tecla({ valor: "529.982.247-25", cursor: 6 }, "Backspace", mascaraDocumento);
    expect(doc.valor).toBe("529.922.472-5");
    expect(doc.valor.slice(0, doc.cursor)).toBe("529.9");
    // "(81) 99|999-0000": apaga um 9 → cursor continua depois de "(81) 9".
    const tel = tecla({ valor: "(81) 99999-0000", cursor: 7 }, "Backspace", mascaraTelefone);
    expect(tel.valor).toBe("(81) 9999-0000");
    expect(tel.valor.slice(0, tel.cursor)).toBe("(81) 9");
    // "18|9,90": apaga o 8 → "19,90" com o cursor depois do "1".
    const preco = tecla({ valor: "189,90", cursor: 2 }, "Backspace", mascaraDecimal);
    expect(preco).toEqual({ valor: "19,90", cursor: 1 });
  });

  it("inserir no meio mantém o cursor depois do dígito novo", () => {
    const doc = tecla({ valor: "123.456.7", cursor: 1 }, "9", mascaraDocumento);
    expect(doc.valor).toBe("192.345.67");
    expect(doc.valor.slice(0, doc.cursor)).toBe("19");
    const tel = tecla({ valor: "(81) 9999-0000", cursor: 5 }, "9", mascaraTelefone);
    expect(tel.valor).toBe("(81) 99999-0000");
    expect(tel.valor.slice(0, tel.cursor)).toBe("(81) 9");
  });
});

describe("semVirgulaFinal", () => {
  it("tira só a vírgula pendurada", () => {
    expect(semVirgulaFinal("5,")).toBe("5");
    expect(semVirgulaFinal("189,9")).toBe("189,9");
    expect(parseDesconto(semVirgulaFinal("5,"))).toBe(5);
    expect(parseDecimal(semVirgulaFinal("189,"))).toBe(189);
  });
});
