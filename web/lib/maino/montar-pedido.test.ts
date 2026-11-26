import { describe, expect, it } from "vitest";
import type { ConfigMaino } from "./config";
import { montarPedidoMaino, type PedidoParaMaino } from "./montar-pedido";

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
