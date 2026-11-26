import { describe, expect, it } from "vitest";
import type { ConfigMaino } from "./config";
import { montarPedidoMaino, repartirDesconto, type PedidoParaMaino } from "./montar-pedido";

const cfg: ConfigMaino = {
  apiUrl: "x",
  applicationUid: "u",
  email: "e",
  senha: "s",
  modalidadeFrete: 9,
};

const base: PedidoParaMaino = {
  numero: 42,
  cliente_tipo_pessoa: "PJ",
  cliente_documento: "12345678000199",
  cliente_nome: "Loja Ltda",
  cliente_indicador_ie: "contribuinte",
  cliente_inscricao_estadual: "123456",
  entrega_cep: "50010000",
  entrega_logradouro: "Rua A",
  entrega_numero: "10",
  entrega_complemento: "sala 2",
  entrega_bairro: "Centro",
  entrega_cidade: "Recife",
  entrega_uf: "PE",
  frete_valor: 15.5,
  observacao: "obs",
  desconto_origem: "nenhum",
  desconto_valor: 0,
  itens: [{ codigo: "P1", nome: "Produto 1", quantidade: 3, preco_unitario: 90.9 }],
  email: "loja@x.com",
  telefone: "(81) 99999-0000",
};

type Saida = {
  numero: string;
  observacao?: string;
  cliente: Record<string, unknown>;
  itens: Record<string, unknown>[];
  modalidade_frete: number;
  valor_frete: number;
  cobranca?: Record<string, unknown>;
};
const montar = (p: PedidoParaMaino, c = cfg, ibge: number | null = 2611606) =>
  montarPedidoMaino(p, c, ibge) as Saida;

describe("montarPedidoMaino", () => {
  it("PJ contribuinte", () => {
    const r = montar(base);
    expect(r.numero).toBe("SITE-42");
    expect(r.observacao).toBe("obs");
    expect(r.cliente).toMatchObject({
      cnpj: "12345678000199",
      razao_social: "Loja Ltda",
      indicador_ie: 1,
      inscricao_estadual: "123456",
      cep: "50010000",
      uf: "PE",
      endereco: "Rua A",
      numero: "10",
      complemento: "sala 2",
      bairro: "Centro",
      municipio: 2611606,
      email: "loja@x.com",
      somente_busca: false,
    });
    expect(r.cliente.cpf).toBeUndefined();
    expect(r.itens[0]).toEqual({ codigo: "P1", descricao: "Produto 1", pu: 90.9, quantidade: 3 });
    expect(r.modalidade_frete).toBe(9);
    expect(r.valor_frete).toBe(15.5);
  });

  it("PF não contribuinte", () => {
    const r = montar({
      ...base,
      cliente_tipo_pessoa: "PF",
      cliente_documento: "12345678901",
      cliente_indicador_ie: "nao_contribuinte",
      cliente_inscricao_estadual: null,
    });
    expect(r.cliente.cpf).toBe("12345678901");
    expect(r.cliente.cnpj).toBeUndefined();
    expect(r.cliente.indicador_ie).toBe(9);
    expect(r.cliente.inscricao_estadual).toBeUndefined();
  });

  it("isento vira 2", () => {
    expect(montar({ ...base, cliente_indicador_ie: "isento" }).cliente.indicador_ie).toBe(2);
  });

  it("telefone com DDD", () => {
    const c = montar(base).cliente;
    expect(c.ddd).toBe("81");
    expect(c.telefone).toBe("999990000");
  });

  it("sem telefone omite ddd e telefone", () => {
    for (const telefone of [null, "", "123"]) {
      const c = montar({ ...base, telefone }).cliente;
      expect(c.ddd).toBeUndefined();
      expect(c.telefone).toBeUndefined();
    }
  });

  it("cobranca só com condição", () => {
    expect(montar(base).cobranca).toBeUndefined();
    const r = montar(base, {
      ...cfg,
      condicaoPagamentoId: "55",
      formaPagamento: 3,
      planoDeConta: "1.1",
    });
    expect(r.cobranca).toEqual({
      forma_pagamento: 3,
      plano_de_conta: "1.1",
      condicao_pagamento_id: "55",
    });
  });

  it("ibge null omite municipio", () => {
    expect(montar(base, cfg, null).cliente.municipio).toBeUndefined();
  });
});

type Item = { codigo: string; nome: string; quantidade: number; preco_unitario: number };
const item = (codigo: string, quantidade: number, preco_unitario: number): Item => ({
  codigo,
  nome: codigo,
  quantidade,
  preco_unitario,
});

/** Total em centavos do que a NF-e cobra pelos itens: Σ qtd × (pu − valor_desconto). */
function totalNota(itens: Record<string, unknown>[]): number {
  return itens.reduce(
    (a, i) =>
      a + Math.round(((i.pu as number) - ((i.valor_desconto as number | undefined) ?? 0)) * 100) * (i.quantidade as number),
    0,
  );
}
const subtotalCents = (itens: Item[]) => itens.reduce((a, i) => a + Math.round(i.preco_unitario * 100) * i.quantidade, 0);

describe("desconto do cupom nos itens", () => {
  const comCupom = (itens: Item[], desconto_valor: number) =>
    montar({ ...base, itens, desconto_origem: "cupom", desconto_valor }).itens;

  it.each([
    ["um item", [item("A", 1, 100)], 10],
    ["um item qtd>1", [item("A", 3, 90.9)], 27.27],
    ["vários itens", [item("A", 1, 100), item("B", 1, 50), item("C", 1, 33.33)], 18.33],
    ["vários itens com qtd>1 e um de qtd 1", [item("A", 7, 12.34), item("B", 3, 9.99), item("C", 1, 5)], 13.17],
    ["resíduo de centavos absorvido pelo item de qtd 1", [item("A", 3, 10), item("B", 1, 10)], 1],
    ["percentual 10% de subtotal quebrado", [item("A", 2, 19.99), item("B", 5, 3.33), item("C", 1, 0.99)], 5.76],
  ] as const)("%s: total da nota = subtotal − desconto", (_n, itens, desconto) => {
    const r = comCupom([...itens], desconto);
    expect(totalNota(r)).toBe(subtotalCents([...itens]) - Math.round(desconto * 100));
    for (const i of r) {
      if (i.valor_desconto !== undefined) {
        expect(i.valor_desconto as number).toBeGreaterThan(0);
        expect(i.valor_desconto as number).toBeLessThan(i.pu as number);
        expect(String(i.valor_desconto)).toMatch(/^\d+(\.\d{1,2})?$/);
      }
      expect(i.percentual_desconto).toBeUndefined();
    }
  });

  it("sem item de qtd 1 o desvio fica em até meio centavo × qtd por linha", () => {
    const itens = [item("A", 3, 10), item("B", 7, 10)];
    const r = comCupom(itens, 1);
    const desvio = Math.abs(totalNota(r) - (subtotalCents(itens) - 100));
    expect(desvio).toBeLessThanOrEqual(Math.ceil(3 / 2) + Math.ceil(7 / 2));
  });

  it("proporcional ao total da linha", () => {
    expect(repartirDesconto([{ quantidade: 1, preco_unitario: 300 }, { quantidade: 1, preco_unitario: 100 }], 40)).toEqual([
      30, 10,
    ]);
  });

  it("desconto do cliente não é aplicado de novo (já está no preço unitário)", () => {
    const r = montar({ ...base, desconto_origem: "cliente", desconto_valor: 27.27 });
    expect(r.itens[0].valor_desconto).toBeUndefined();
    expect(r.itens[0].pu).toBe(90.9);
  });

  it("sem desconto não manda valor_desconto", () => {
    expect(montar(base).itens[0].valor_desconto).toBeUndefined();
    expect(montar({ ...base, desconto_origem: "cupom", desconto_valor: 0 }).itens[0].valor_desconto).toBeUndefined();
  });
});
