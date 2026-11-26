import {
  atualizarQuantidade,
  buscarInfoItens,
  gerarPedido,
  limparCupom,
  removerItem,
  simularCarrinho,
} from "@/lib/carrinho";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;

beforeEach(() => falso.limpar());

describe("simularCarrinho", () => {
  it("normaliza numeric em string e envia o cupom limpo", async () => {
    falso.rpc.mockResolvedValue({
      data: {
        itens: [
          {
            produto_id: "a",
            codigo: "NX-1",
            nome: "A",
            quantidade: "2",
            preco_tabela: "100",
            desconto_percentual: "10",
            preco_unitario: "90",
            total_linha: "180",
            valido: true,
            motivo: null,
          },
        ],
        subtotal: "200",
        desconto_cliente: "20",
        desconto_cupom: "0",
        desconto_aplicado: "20",
        desconto_origem: "cliente",
        frete: "0",
        icms: "0",
        difal: "0",
        total: "180",
        cupom: { codigo: null, situacao: "ausente", motivo: null, valor_minimo: null },
        bloqueios: [],
      },
      error: null,
    });
    const r = await simularCarrinho("  nex10 ");
    expect(falso.rpc).toHaveBeenCalledWith("simular_pedido", { p_cupom: "nex10" });
    expect(r.ok && r.sim.itens[0].quantidade).toBe(2);
    expect(r.ok && r.sim.total).toBe(180);
  });

  it("sem sessão e erro do banco são distintos", async () => {
    falso.getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    expect(await simularCarrinho()).toEqual({ ok: false, motivo: "sem_sessao" });
    falso.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await simularCarrinho()).toEqual({ ok: false, motivo: "erro" });
  });

  it("cupom vazio não é enviado; longo é cortado em 64", () => {
    expect(limparCupom("   ")).toBeUndefined();
    expect(limparCupom("x".repeat(80))).toHaveLength(64);
  });
});

describe("alterar e remover itens filtram pelo usuário atual", () => {
  it("atualizarQuantidade filtra lojista_id e produto_id", async () => {
    falso.respostas.carrinho_itens = { data: [{ produto_id: "a" }], error: null };
    expect(await atualizarQuantidade("u1", "a", 3)).toEqual({ ok: true });
    expect(falso.filtros("carrinho_itens")).toEqual([
      ["lojista_id", "u1"],
      ["produto_id", "a"],
    ]);
  });

  it("quantidade fora de 1–9999 nem chega ao banco", async () => {
    expect(await atualizarQuantidade("u1", "a", 0)).toEqual({ ok: false, erro: "quantidade_invalida" });
    expect(await atualizarQuantidade("u1", "a", 10000)).toEqual({ ok: false, erro: "quantidade_invalida" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("nenhuma linha atualizada (RLS/produto inativo) é falha", async () => {
    falso.respostas.carrinho_itens = { data: [], error: null };
    expect(await atualizarQuantidade("u1", "a", 3)).toEqual({ ok: false });
  });

  it("removerItem filtra lojista_id e produto_id", async () => {
    falso.respostas.carrinho_itens = { data: null, error: null };
    expect(await removerItem("u1", "a")).toEqual({ ok: true });
    expect(falso.filtros("carrinho_itens")).toEqual([
      ["lojista_id", "u1"],
      ["produto_id", "a"],
    ]);
  });
});

describe("gerarPedido (criar_pedido)", () => {
  it("sucesso devolve id e número", async () => {
    falso.rpc.mockResolvedValue({ data: { ok: true, id: "p1", numero: "1042" }, error: null, status: 200 });
    expect(await gerarPedido(" NEX10 ", "  entregar de manhã ")).toEqual({ ok: true, id: "p1", numero: 1042 });
    expect(falso.rpc).toHaveBeenCalledWith("criar_pedido", { p_cupom: "NEX10", p_observacao: "entregar de manhã" });
  });

  it("sem cupom e sem observação não envia os parâmetros", async () => {
    falso.rpc.mockResolvedValue({ data: { ok: true, id: "p1", numero: 1 }, error: null, status: 200 });
    await gerarPedido(null, "   ");
    expect(falso.rpc).toHaveBeenCalledWith("criar_pedido", { p_cupom: undefined, p_observacao: undefined });
  });

  it("cupom inválido traz motivo e valor mínimo como número", async () => {
    falso.rpc.mockResolvedValue({
      data: { ok: false, erro: "cupom_invalido", motivo: "valor_minimo", valor_minimo: "500.00" },
      error: null,
      status: 200,
    });
    expect(await gerarPedido("NEX", "")).toEqual({
      ok: false,
      erro: "cupom_invalido",
      motivo: "valor_minimo",
      valorMinimo: 500,
    });
  });

  it("bloqueio do banco volta como erro", async () => {
    falso.rpc.mockResolvedValue({ data: { ok: false, erro: "sem_endereco" }, error: null, status: 200 });
    expect(await gerarPedido(null, "")).toEqual({ ok: false, erro: "sem_endereco" });
  });

  it("observação acima de 500 nem chama o banco", async () => {
    expect(await gerarPedido(null, "x".repeat(501))).toEqual({ ok: false, erro: "observacao_longa" });
    expect(falso.rpc).not.toHaveBeenCalled();
  });

  it("erro do banco com resposta → erro; sem resposta (rede) → incerto", async () => {
    falso.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" }, status: 500 });
    expect(await gerarPedido(null, "")).toEqual({ ok: false, erro: "erro" });
    falso.rpc.mockResolvedValueOnce({ data: null, error: { message: "FetchError" }, status: 0 });
    expect(await gerarPedido(null, "")).toEqual({ ok: false, erro: "incerto" });
    falso.rpc.mockRejectedValueOnce(new Error("rede"));
    expect(await gerarPedido(null, "")).toEqual({ ok: false, erro: "incerto" });
  });
});

describe("buscarInfoItens", () => {
  it("primeira imagem por ordem, ignorando url vazia", async () => {
    falso.respostas.produtos = {
      data: [
        {
          id: "a",
          slug: "nx-1",
          produto_imagens: [
            { url: "https://i/2.png", ordem: 2 },
            { url: "", ordem: 0 },
            { url: "https://i/1.png", ordem: 1 },
          ],
        },
        { id: "b", slug: "nx-2", produto_imagens: [] },
      ],
      error: null,
    };
    const mapa = await buscarInfoItens(["a", "b", "a"]);
    expect(mapa.get("a")).toEqual({ slug: "nx-1", imagem: "https://i/1.png" });
    expect(mapa.get("b")).toEqual({ slug: "nx-2", imagem: null });
    expect(falso.chamadas.find((c) => c.metodo === "in")?.args).toEqual(["id", ["a", "b"]]);
  });
});
