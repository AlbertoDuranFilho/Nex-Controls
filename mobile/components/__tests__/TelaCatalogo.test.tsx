import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TelaCatalogo from "@/app/(abas)/index";
import type { ValorSessao } from "@/lib/sessao";

const mockRpc = jest.fn();
const mockProdutos = { linhas: [] as unknown[], erro: null as null | { message: string } };
const mockRecarregarPerfil = jest.fn();
const mockSessao = { valor: {} as Partial<ValorSessao> };

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/contagem-carrinho", () => ({
  useContagemCarrinho: () => ({ contagem: 0, atualizarContagem: jest.fn(), definirContagem: jest.fn() }),
}));
jest.mock("@/lib/sessao", () => ({ useSessao: () => mockSessao.valor }));
jest.mock("@/lib/supabase", () => ({
  SITE_URL: "https://exemplo.test",
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: async () => ({ data: mockProdutos.erro ? null : mockProdutos.linhas, error: mockProdutos.erro }),
      };
      return q;
    },
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
}));

function linha(id: string, codigo: string, nome: string) {
  return {
    id,
    slug: codigo.toLowerCase(),
    codigo,
    nome,
    destaque: null,
    compatibilidade: null,
    descricao: null,
    aplicacoes: null,
    manual_url: null,
    produto_imagens: [],
    produto_especificacoes: [],
  };
}

async function puxar() {
  const lista = screen.getByTestId("lista-produtos");
  await act(async () => {
    await lista.props.refreshControl.props.onRefresh();
  });
}

function sessao(parcial: Partial<ValorSessao>) {
  mockSessao.valor = {
    carregando: false,
    papel: "visitante",
    lojistaAtivo: false,
    usuarioId: null,
    recarregarPerfil: mockRecarregarPerfil,
    ...parcial,
  };
}

beforeEach(() => {
  mockRpc.mockReset();
  mockRecarregarPerfil.mockReset();
  mockProdutos.erro = null;
  mockProdutos.linhas = [linha("a", "NX-100", "Controle"), linha("b", "NX-200", "Receptor")];
});

describe("Catálogo", () => {
  it("visitante vê os produtos sem preço e sem chamar precos_cliente", async () => {
    sessao({});
    await render(<TelaCatalogo />);
    expect(await screen.findByText("Controle")).toBeTruthy();
    expect(screen.getAllByText("Entre para ver preços")).toHaveLength(2);
    expect(screen.queryByTestId("preco-final")).toBeNull();
    expect(screen.queryByTestId("adicionar-a")).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("lojista ativo: uma chamada para a lista; desconto e sob consulta", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    mockRpc.mockResolvedValue({
      data: [{ produto_id: "a", preco_tabela: 100, preco_final: 90, desconto_percentual: 10 }],
      error: null,
    });
    await render(<TelaCatalogo />);
    expect(await screen.findByText("-10%")).toBeTruthy();
    expect(screen.getByTestId("adicionar-a")).toBeTruthy();
    expect(screen.getByTestId("sob-consulta-b")).toBeTruthy();
    expect(screen.queryByTestId("adicionar-b")).toBeNull();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("precos_cliente", { p_produto_ids: ["a", "b"] });

    // a busca filtra na tela, sem nova chamada
    await fireEvent.changeText(screen.getByTestId("campo-busca"), "receptor");
    expect(screen.queryByText("Controle")).toBeNull();
    expect(screen.getByText("Receptor")).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("lojista inativo: sob consulta e aviso, sem chamar preços", async () => {
    sessao({ papel: "lojista", lojistaAtivo: false, usuarioId: "u1" });
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("aviso-inativo")).toBeTruthy();
    expect(screen.getAllByText("Sob consulta")).toHaveLength(2);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("perfil em erro: aviso de preços com 'Tentar de novo' (recarrega o perfil)", async () => {
    sessao({ papel: "erro", usuarioId: "u1" });
    await render(<TelaCatalogo />);
    expect(await screen.findByText("Não foi possível carregar seus preços")).toBeTruthy();
    expect(screen.queryByText("Entre para ver preços")).toBeNull();
    expect(screen.queryByTestId("preco-final")).toBeNull();
    await fireEvent.press(screen.getByText("Tentar de novo"));
    expect(mockRecarregarPerfil).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("falha nos preços: aviso e nova tentativa faz outra chamada", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "falhou" } });
    mockRpc.mockResolvedValueOnce({
      data: [{ produto_id: "a", preco_tabela: 50, preco_final: 50, desconto_percentual: 0 }],
      error: null,
    });
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("aviso-erro-precos")).toBeTruthy();
    expect(screen.queryByTestId("adicionar-a")).toBeNull();
    await fireEvent.press(screen.getByText("Tentar de novo"));
    expect(await screen.findByTestId("adicionar-a")).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("puxar para atualizar com falha nos preços mantém os preços já mostrados e avisa", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    mockRpc.mockResolvedValueOnce({
      data: [{ produto_id: "a", preco_tabela: 50, preco_final: 50, desconto_percentual: 0 }],
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "falhou" } });
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("adicionar-a")).toBeTruthy();
    await puxar();
    expect(await screen.findByTestId("aviso-erro-precos")).toBeTruthy();
    expect(screen.getByTestId("adicionar-a")).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("puxar para atualizar tenta os preços de novo mesmo se a lista falhar", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "falhou" } });
    mockRpc.mockResolvedValueOnce({
      data: [{ produto_id: "a", preco_tabela: 50, preco_final: 50, desconto_percentual: 0 }],
      error: null,
    });
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("aviso-erro-precos")).toBeTruthy();
    mockProdutos.erro = { message: "offline" };
    await puxar();
    expect(await screen.findByTestId("adicionar-a")).toBeTruthy();
    expect(screen.getByTestId("aviso-erro-catalogo")).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("busca sem resultado mostra o estado vazio e limpa", async () => {
    sessao({});
    await render(<TelaCatalogo />);
    await screen.findByText("Controle");
    await fireEvent.changeText(screen.getByTestId("campo-busca"), "zzz");
    expect(screen.getByTestId("busca-vazia")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("limpar-busca"));
    expect(screen.getByText("Controle")).toBeTruthy();
  });

  it("catálogo vazio e erro de carga", async () => {
    sessao({});
    mockProdutos.linhas = [];
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("catalogo-vazio")).toBeTruthy();
  });

  it("erro ao carregar mostra 'Tentar novamente'", async () => {
    sessao({});
    mockProdutos.erro = { message: "offline" };
    await render(<TelaCatalogo />);
    expect(await screen.findByTestId("catalogo-erro")).toBeTruthy();
    mockProdutos.erro = null;
    await fireEvent.press(screen.getByText("Tentar novamente"));
    expect(await screen.findByText("Controle")).toBeTruthy();
  });
});
