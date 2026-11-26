import { mensagemBloqueio, mensagemCupom } from "@/lib/mensagens-carrinho";
import { textos } from "@/constants/textos";
// Fonte da verdade: as mensagens do site em português.
import pt from "../../../web/messages/pt.json";

jest.mock("@/lib/supabase", () => ({ SITE_URL: "https://exemplo.test", supabase: {} }));

type Mensagens = Record<string, string>;
const site = (pt as unknown as { carrinho: Mensagens; pedidos: Mensagens & { status: Mensagens } });
const carrinhoSite = site.carrinho;

const MOTIVOS: [string, string][] = [
  ["inexistente", "cupomInexistente"],
  ["inativo", "cupomInativo"],
  ["fora_validade", "cupomForaValidade"],
  ["esgotado", "cupomEsgotado"],
  ["ja_usado", "cupomJaUsado"],
];
const BLOQUEIOS: [string, string][] = [
  ["conta_inativa", "bloqueioContaInativa"],
  ["carrinho_vazio", "bloqueioCarrinhoVazio"],
  ["sem_endereco", "bloqueioSemEndereco"],
  ["itens_invalidos", "bloqueioItensInvalidos"],
  ["observacao_longa", "erroObservacaoLonga"],
];

describe("mensagens de bloqueio do carrinho (iguais ao site)", () => {
  it.each(BLOQUEIOS)("bloqueio %s → texto do site (%s)", (bloqueio, chave) => {
    expect(mensagemBloqueio(bloqueio)).toBe(carrinhoSite[chave]);
  });

  it("bloqueio ou erro desconhecido cai na mensagem genérica do site", () => {
    expect(mensagemBloqueio("xpto")).toBe(carrinhoSite.bloqueioErro);
    expect(mensagemBloqueio("erro")).toBe(carrinhoSite.bloqueioErro);
  });

  it("não confunde chave herdada de Object com bloqueio", () => {
    expect(mensagemBloqueio("toString")).toBe(carrinhoSite.bloqueioErro);
  });
});

describe("mensagens de cupom (iguais ao site)", () => {
  it.each(MOTIVOS)("motivo %s → texto do site (%s)", (motivo, chave) => {
    expect(mensagemCupom(motivo, null)).toBe(carrinhoSite[chave]);
  });

  it("valor mínimo interpola R$ 1.000,00 no texto do site", () => {
    const esperado = carrinhoSite.cupomValorMinimo.replace("{valor}", "R$ 1.000,00");
    expect(mensagemCupom("valor_minimo", 1000)).toBe(esperado);
    expect(mensagemCupom("valor_minimo", 1000)).toMatch(/R\$\s1\.000,00/);
  });

  it("motivo desconhecido cai na mensagem genérica", () => {
    expect(mensagemCupom("xpto", null)).toBe(carrinhoSite.cupomErro);
  });
});

describe("textos do app copiados do site", () => {
  it("textos fixos do carrinho são idênticos aos do site", () => {
    const iguais = [
      "vazio",
      "irCatalogo",
      "precoUnitario",
      "remover",
      "itemInativo",
      "itemSemPreco",
      "erroQuantidade",
      "erroAtualizar",
      "cupom",
      "aplicar",
      "tirarCupom",
      "cupomErro",
      "resumo",
      "subtotal",
      "descontoCliente",
      "frete",
      "total",
      "observacao",
      "observacaoAjuda",
      "gerar",
      "gerando",
      "aviso",
      "bloqueioErro",
      "erroGerarIncerto",
      "irMeusPedidos",
      "erroCarregar",
    ] as const;
    for (const chave of iguais) expect([chave, textos.carrinho[chave]]).toEqual([chave, carrinhoSite[chave]]);
  });

  it("textos com variável batem com o site", () => {
    expect(textos.carrinho.cupomAplicado("NEX10")).toBe(carrinhoSite.cupomAplicado.replace("{codigo}", "NEX10"));
    expect(textos.carrinho.cupomPior("NEX10")).toBe(carrinhoSite.cupomPior.replace("{codigo}", "NEX10"));
    expect(textos.carrinho.descontoCupom("NEX10")).toBe(carrinhoSite.descontoCupom.replace("{codigo}", "NEX10"));
    expect(textos.carrinho.removerDe("Controle")).toBe(carrinhoSite.removerDe.replace("{nome}", "Controle"));
  });

  it("rótulos de status do pedido são os do site", () => {
    expect(textos.pedidos.status).toEqual(site.pedidos.status);
    expect(textos.pedidos.confirmacao).toBe(site.pedidos.confirmacao);
    expect(textos.pedidoConcluido.descricao).toBe(site.pedidos.confirmacao);
    expect(textos.pedidos.notaFiscal).toBe(site.pedidos.notaFiscal);
    expect(textos.pedidos.notaCancelada).toBe(site.pedidos.notaCancelada);
    expect(textos.pedidos.historicoVazio).toBe(site.pedidos.historicoVazio);
  });
});
