import { adicionarAoCarrinho, lerQuantidade, limitarQuantidade, quantidadeValida } from "../carrinho";

const mockRpc = jest.fn();
const mockSessao = { atual: { user: { id: "u1" } } as unknown };

jest.mock("@/lib/supabase", () => ({
  SITE_URL: "https://exemplo.test",
  supabase: {
    auth: { getSession: async () => ({ data: { session: mockSessao.atual }, error: null }) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

beforeEach(() => {
  mockRpc.mockReset();
  mockSessao.atual = { user: { id: "u1" } };
});

describe("quantidade", () => {
  it("aceita só inteiros de 1 a 9999", () => {
    expect(quantidadeValida(1)).toBe(true);
    expect(quantidadeValida(9999)).toBe(true);
    expect(quantidadeValida(0)).toBe(false);
    expect(quantidadeValida(10000)).toBe(false);
    expect(quantidadeValida(1.5)).toBe(false);
    expect(lerQuantidade("12")).toBe(12);
    expect(lerQuantidade("0")).toBeNull();
    expect(lerQuantidade("")).toBeNull();
    expect(lerQuantidade("1a")).toBeNull();
    expect(limitarQuantidade(0)).toBe(1);
    expect(limitarQuantidade(12000)).toBe(9999);
  });
});

describe("adicionarAoCarrinho", () => {
  it("chama carrinho_adicionar com os mesmos parâmetros do site", async () => {
    mockRpc.mockResolvedValue({ data: 3, error: null });
    expect(await adicionarAoCarrinho("p1", 2)).toEqual({ ok: true, quantidade: 3 });
    expect(mockRpc).toHaveBeenCalledWith("carrinho_adicionar", { p_produto_id: "p1", p_quantidade: 2 });
  });

  it("quantidade inválida não chama o banco", async () => {
    expect(await adicionarAoCarrinho("p1", 0)).toEqual({ ok: false, erro: "quantidade_invalida" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("sem sessão → nao_logado", async () => {
    mockSessao.atual = null;
    expect(await adicionarAoCarrinho("p1", 1)).toEqual({ ok: false, erro: "nao_logado" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("mapeia os erros do banco", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "quantidade_invalida" } });
    expect(await adicionarAoCarrinho("p1", 1)).toEqual({ ok: false, erro: "quantidade_invalida" });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "new row violates row-level security" } });
    expect(await adicionarAoCarrinho("p1", 1)).toEqual({ ok: false, erro: "indisponivel" });
    mockRpc.mockRejectedValueOnce(new Error("Network request failed"));
    expect(await adicionarAoCarrinho("p1", 1)).toEqual({ ok: false, erro: "indisponivel" });
  });
});
