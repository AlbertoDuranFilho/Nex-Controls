import { blocosDeTexto, filtrarProdutos, listarProdutos, paraProduto } from "../catalogo";
import type { LinhaProduto, ProdutoPublico } from "../catalogo";

const mockConsulta = { tabela: "", filtros: [] as unknown[][], ordem: "", colunas: "" };
const mockResultado = { data: [] as unknown[] | null, error: null as null | { message: string } };

jest.mock("@/lib/supabase", () => ({
  SITE_URL: "https://exemplo.test",
  supabase: {
    from: (tabela: string) => {
      mockConsulta.tabela = tabela;
      const q = {
        select: (c: string) => ((mockConsulta.colunas = c), q),
        eq: (...a: unknown[]) => (mockConsulta.filtros.push(a), q),
        order: (o: string) => ((mockConsulta.ordem = o), Promise.resolve(mockResultado)),
      };
      return q;
    },
  },
}));

function linha(parcial: Partial<LinhaProduto> = {}): LinhaProduto {
  return {
    id: "1",
    slug: "controle-x",
    codigo: "NX-100",
    nome: "Controle X",
    destaque: null,
    compatibilidade: null,
    descricao: null,
    aplicacoes: null,
    manual_url: null,
    produto_imagens: [],
    produto_especificacoes: [],
    ...parcial,
  };
}

describe("paraProduto", () => {
  it("ordena imagens e especificações por ordem e ignora url vazia", () => {
    const p = paraProduto(
      linha({
        produto_imagens: [
          { url: "https://img/2.png", alt: null, ordem: 2 },
          { url: "", alt: null, ordem: 0 },
          { url: "https://img/1.png", alt: "frente", ordem: 1 },
        ],
        produto_especificacoes: [
          { nome: "Tensão", valor: "220V", ordem: 2 },
          { nome: "Cor", valor: "Preto", ordem: 1 },
        ],
      }),
    );
    expect(p.imagens).toEqual([
      { url: "https://img/1.png", alt: "frente" },
      { url: "https://img/2.png", alt: null },
    ]);
    expect(p.especificacoes.map((e) => e.nome)).toEqual(["Cor", "Tensão"]);
    expect(p).not.toHaveProperty("produto_imagens");
  });

  it("aceita relações nulas", () => {
    const p = paraProduto(linha({ produto_imagens: null, produto_especificacoes: null }));
    expect(p.imagens).toEqual([]);
    expect(p.especificacoes).toEqual([]);
  });
});

describe("filtrarProdutos", () => {
  const produtos: ProdutoPublico[] = [
    paraProduto(linha({ id: "1", codigo: "NX-100", nome: "Controle de Portão" })),
    paraProduto(linha({ id: "2", codigo: "NX-200", nome: "Receptor", compatibilidade: "Garen, PPA" })),
  ];

  it("busca por código, nome (sem acento/maiúscula) e compatibilidade", () => {
    expect(filtrarProdutos(produtos, "nx-2").map((p) => p.id)).toEqual(["2"]);
    expect(filtrarProdutos(produtos, "PORTAO").map((p) => p.id)).toEqual(["1"]);
    expect(filtrarProdutos(produtos, "ppa").map((p) => p.id)).toEqual(["2"]);
    expect(filtrarProdutos(produtos, "  ").map((p) => p.id)).toEqual(["1", "2"]);
    expect(filtrarProdutos(produtos, "inexistente")).toEqual([]);
  });
});

describe("blocosDeTexto", () => {
  it("separa parágrafos e listas como no site", () => {
    expect(blocosDeTexto("Primeiro\n\n- a\n- b\r\n\r\nFim")).toEqual([
      { tipo: "paragrafo", texto: "Primeiro" },
      { tipo: "lista", itens: ["a", "b"] },
      { tipo: "paragrafo", texto: "Fim" },
    ]);
    expect(blocosDeTexto(null)).toEqual([]);
    expect(blocosDeTexto("  \n\n ")).toEqual([]);
  });
});

describe("listarProdutos", () => {
  it("lê só produtos ativos, ordenados por código, com imagens e especificações", async () => {
    mockResultado.data = [linha()];
    const lista = await listarProdutos();
    expect(mockConsulta.tabela).toBe("produtos");
    expect(mockConsulta.filtros).toEqual([["ativo", true]]);
    expect(mockConsulta.ordem).toBe("codigo");
    expect(mockConsulta.colunas).toContain("produto_imagens(url, alt, ordem)");
    expect(mockConsulta.colunas).not.toContain("preco");
    expect(lista[0].codigo).toBe("NX-100");
  });

  it("erro do banco vira exceção", async () => {
    mockResultado.data = null;
    mockResultado.error = { message: "falhou" };
    await expect(listarProdutos()).rejects.toThrow("falhou");
  });
});
