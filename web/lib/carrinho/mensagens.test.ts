import { describe, expect, it } from "vitest";
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { chaveBloqueio, chaveCupom, mensagemBloqueio, mensagemCupom, type Tradutor } from "./mensagens";

type Mensagens = Record<string, string>;
const carrinhoPt = (pt as unknown as { carrinho: Mensagens }).carrinho;

// Tradutor de teste: lê messages/pt.json e interpola {chave}; chave ausente lança.
const t: Tradutor = (chave, valores) => {
  const texto = carrinhoPt?.[chave];
  if (typeof texto !== "string") throw new Error(`chave ausente: carrinho.${chave}`);
  return texto.replace(/\{(\w+)\}/g, (_, k) => String(valores?.[k] ?? `{${k}}`));
};

const MOTIVOS = ["inexistente", "inativo", "fora_validade", "esgotado", "ja_usado", "valor_minimo"];
const BLOQUEIOS = ["conta_inativa", "carrinho_vazio", "sem_endereco", "itens_invalidos"];

describe("mensagemCupom", () => {
  it.each(MOTIVOS)("motivo %s mapeia para uma chave existente e própria", (motivo) => {
    const chave = chaveCupom(motivo);
    expect(carrinhoPt[chave]).toBeTypeOf("string");
    expect(chave).not.toBe(chaveCupom("desconhecido"));
    expect(() => mensagemCupom(motivo, 1000, t)).not.toThrow();
  });

  it("valor_minimo interpola R$ 1.000,00", () => {
    expect(mensagemCupom("valor_minimo", 1000, t)).toMatch(/R\$\s1\.000,00/);
  });

  it("motivo desconhecido cai na mensagem genérica", () => {
    expect(mensagemCupom("xpto", null, t)).toBe(carrinhoPt[chaveCupom("desconhecido")]);
  });
});

describe("mensagemBloqueio", () => {
  it.each(BLOQUEIOS)("bloqueio %s mapeia para uma chave existente e própria", (b) => {
    const chave = chaveBloqueio(b);
    expect(carrinhoPt[chave]).toBeTypeOf("string");
    expect(chave).not.toBe(chaveBloqueio("desconhecido"));
    expect(mensagemBloqueio(b, t)).toBe(carrinhoPt[chave]);
  });

  it("bloqueio desconhecido cai na mensagem genérica", () => {
    expect(mensagemBloqueio("xpto", t)).toBe(carrinhoPt[chaveBloqueio("desconhecido")]);
  });
});

describe("mensagens do carrinho", () => {
  it("en e es têm as mesmas chaves de carrinho que pt", () => {
    const chaves = Object.keys(carrinhoPt).sort();
    expect(Object.keys((en as unknown as { carrinho: Mensagens }).carrinho).sort()).toEqual(chaves);
    expect(Object.keys((es as unknown as { carrinho: Mensagens }).carrinho).sort()).toEqual(chaves);
  });
});
