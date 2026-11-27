import { buscarPrecos, estadoPreco, formatarMoeda, mapaDePrecos, temDesconto, textoDesconto } from "../precos";
import type { EntradaEstadoPreco } from "../precos";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({
  SITE_URL: "https://exemplo.test",
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

const preco = { tabela: 100, final: 90, desconto: 10 };
const base: EntradaEstadoPreco = {
  carregandoSessao: false,
  papel: "lojista",
  lojistaAtivo: true,
  situacao: "ok",
  preco,
};

// textos com espaço não separável do Intl
const semNbsp = (s: string) => s.replace(/ /g, " ");

describe("estadoPreco", () => {
  it("visitante nunca vê preço", () => {
    expect(estadoPreco({ ...base, papel: "visitante", lojistaAtivo: false })).toEqual({ tipo: "visitante" });
  });

  it("admin é tratado como visitante (sem preço)", () => {
    expect(estadoPreco({ ...base, papel: "admin" })).toEqual({ tipo: "visitante" });
  });

  it("sessão carregando mostra carregando", () => {
    expect(estadoPreco({ ...base, carregandoSessao: true })).toEqual({ tipo: "carregando" });
  });

  it("perfil em erro: sem preço e sem botão", () => {
    expect(estadoPreco({ ...base, papel: "erro", lojistaAtivo: false })).toEqual({ tipo: "erro" });
  });

  it("lojista inativo → sob consulta, mesmo com preço", () => {
    expect(estadoPreco({ ...base, lojistaAtivo: false })).toEqual({ tipo: "consulta" });
  });

  it("produto sem preço → sob consulta", () => {
    expect(estadoPreco({ ...base, preco: undefined })).toEqual({ tipo: "consulta" });
  });

  it("preços carregando ou com erro", () => {
    expect(estadoPreco({ ...base, situacao: "carregando" })).toEqual({ tipo: "carregando" });
    expect(estadoPreco({ ...base, situacao: "ocioso" })).toEqual({ tipo: "carregando" });
    expect(estadoPreco({ ...base, situacao: "erro" })).toEqual({ tipo: "erro" });
  });

  it("lojista ativo com preço", () => {
    expect(estadoPreco(base)).toEqual({ tipo: "preco", ...preco });
  });
});

describe("desconto e formatação", () => {
  it("só há desconto com percentual > 0 e final menor que a tabela", () => {
    expect(temDesconto(preco)).toBe(true);
    expect(temDesconto({ tabela: 100, final: 100, desconto: 0 })).toBe(false);
    expect(temDesconto({ tabela: 100, final: 100, desconto: 0.001 })).toBe(false);
  });

  it("formata em reais e o selo do desconto", () => {
    expect(semNbsp(formatarMoeda(1234.5))).toBe("R$ 1.234,50");
    expect(textoDesconto(10)).toBe("-10%");
    expect(textoDesconto(12.5)).toBe("-12,5%");
  });

  it("normaliza numeric que chega como string", () => {
    const mapa = mapaDePrecos([
      { produto_id: "a", preco_tabela: "200.00", preco_final: "180.00", desconto_percentual: "10.00" },
      { produto_id: "b", preco_tabela: "x", preco_final: "1", desconto_percentual: null },
      { produto_id: "c", preco_tabela: 50, preco_final: 50, desconto_percentual: null },
    ]);
    expect(mapa.get("a")).toEqual({ tabela: 200, final: 180, desconto: 10 });
    expect(mapa.has("b")).toBe(false);
    expect(mapa.get("c")).toEqual({ tabela: 50, final: 50, desconto: 0 });
  });
});

describe("buscarPrecos", () => {
  beforeEach(() => mockRpc.mockReset());

  it("uma única chamada a precos_cliente com os ids (sem repetidos)", async () => {
    mockRpc.mockResolvedValue({
      data: [{ produto_id: "a", preco_tabela: 10, preco_final: 9, desconto_percentual: 10 }],
      error: null,
    });
    const r = await buscarPrecos(["a", "b", "a"]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("precos_cliente", { p_produto_ids: ["a", "b"] });
    expect(r.ok && r.precos.get("a")).toEqual({ tabela: 10, final: 9, desconto: 10 });
  });

  it("lista vazia não chama o banco", async () => {
    expect(await buscarPrecos([])).toEqual({ ok: true, precos: new Map() });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("erro do banco ou de rede vira { ok: false }", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "permission denied" } });
    expect(await buscarPrecos(["a"])).toEqual({ ok: false });
    mockRpc.mockRejectedValueOnce(new Error("Network request failed"));
    expect(await buscarPrecos(["a"])).toEqual({ ok: false });
  });
});
