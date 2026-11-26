import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TelaCarrinho from "@/app/(abas)/carrinho";
import type { Simulacao } from "@/lib/carrinho";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";
import pt from "../../../web/messages/pt.json";

const carrinhoSite = (pt as unknown as { carrinho: Record<string, string> }).carrinho;

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
const mockAtualizarContagem = jest.fn(async () => {});
const mockDefinirContagem = jest.fn();

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    // na tela de teste a aba está sempre focada: roda como um efeito
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({ type: "dismiss" })) }));
jest.mock("@/lib/contagem-carrinho", () => ({
  ...jest.requireActual("@/lib/contagem-carrinho"),
  useContagemCarrinho: () => ({
    contagem: 0,
    atualizarContagem: mockAtualizarContagem,
    definirContagem: mockDefinirContagem,
  }),
}));
jest.mock("@/lib/sessao", () => ({
  useSessao: () => ({
    carregando: false,
    papel: "lojista",
    lojistaAtivo: true,
    usuarioId: "u1",
    email: "loja@teste.com",
    sair: jest.fn(),
    recarregarPerfil: jest.fn(),
  }),
}));
jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;
const fetchFalso = jest.fn();
jest.spyOn(console, "warn").mockImplementation(() => {});

function simulacao(parcial: Partial<Simulacao> = {}): Simulacao {
  return {
    itens: [
      {
        produto_id: "a",
        codigo: "NX-100",
        nome: "Controle remoto",
        quantidade: 2,
        preco_tabela: 100,
        desconto_percentual: 10,
        preco_unitario: 90,
        total_linha: 180,
        valido: true,
        motivo: null,
      },
    ],
    subtotal: 200,
    desconto_cliente: 20,
    desconto_cupom: 0,
    desconto_aplicado: 20,
    desconto_origem: "cliente",
    frete: 0,
    icms: 0,
    difal: 0,
    total: 180,
    cupom: { codigo: null, situacao: "ausente", motivo: null, valor_minimo: null },
    bloqueios: [],
    ...parcial,
  };
}

let simAtual: Simulacao;
let respostaCriar: unknown;

beforeEach(() => {
  falso.limpar();
  fetchFalso.mockReset();
  fetchFalso.mockResolvedValue({ ok: true, status: 200, json: async () => ({ enviado: true }) });
  globalThis.fetch = fetchFalso as unknown as typeof fetch;
  mockAtualizarContagem.mockClear();
  mockDefinirContagem.mockClear();
  Object.values(mockRouter).forEach((f) => f.mockClear());
  simAtual = simulacao();
  respostaCriar = { data: { ok: true, id: "pedido-1", numero: 1042 }, error: null, status: 200 };
  falso.rpc.mockImplementation(async (nome: string) => {
    if (nome === "simular_pedido") return { data: simAtual, error: null, status: 200 };
    if (nome === "criar_pedido") return respostaCriar;
    return { data: null, error: { message: "?" } };
  });
  falso.respostas.produtos = { data: [], error: null };
});

async function abrir() {
  await render(<TelaCarrinho />);
  await screen.findByTestId("tela-carrinho");
}

describe("Carrinho", () => {
  it("mostra itens, resumo e atualiza o contador da aba com o total de itens", async () => {
    await abrir();
    expect(screen.getByText("Controle remoto")).toBeTruthy();
    expect(screen.getByText(carrinhoSite.subtotal)).toBeTruthy();
    expect(screen.getByTestId("linha-desconto")).toBeTruthy();
    expect(screen.getByTestId("total")).toBeTruthy();
    expect(screen.getByText(carrinhoSite.aviso)).toBeTruthy();
    expect(mockDefinirContagem).toHaveBeenCalledWith(2);
    expect(falso.rpc).toHaveBeenCalledWith("simular_pedido", { p_cupom: undefined });
  });

  it("carrinho vazio mostra o aviso com link para o catálogo", async () => {
    simAtual = simulacao({ itens: [], bloqueios: ["carrinho_vazio"] });
    await render(<TelaCarrinho />);
    expect(await screen.findByTestId("carrinho-vazio")).toBeTruthy();
    expect(screen.getByText(carrinhoSite.vazio)).toBeTruthy();
  });

  it("gerar pedido: criar_pedido, aviso ao site em segundo plano e tela de sucesso com o número", async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    expect(await screen.findByTestId("pedido-concluido")).toBeTruthy();
    expect(screen.getByTestId("numero-pedido").props.children).toBe("Pedido #1042");
    expect(falso.rpc).toHaveBeenCalledWith("criar_pedido", { p_cupom: undefined, p_observacao: undefined });
    await waitFor(() =>
      expect(fetchFalso).toHaveBeenCalledWith("https://site.test/api/app/pedidos/pedido-1/notificar", {
        method: "POST",
        headers: { Authorization: "Bearer token-do-usuario" },
      }),
    );
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(mockAtualizarContagem).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("ver-pedido"));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/pedido/[numero]",
      params: { numero: "1042", novo: "1" },
    });
    await fireEvent.press(screen.getByTestId("continuar-comprando"));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/");
  });

  it("falha do aviso ao site não aparece para o cliente", async () => {
    fetchFalso.mockRejectedValue(new TypeError("Network request failed"));
    await abrir();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    expect(await screen.findByTestId("pedido-concluido")).toBeTruthy();
    await waitFor(() => expect(fetchFalso).toHaveBeenCalled());
    expect(screen.queryByTestId("erro-carrinho")).toBeNull();
  });

  it("cupom inválido no criar_pedido: mesma mensagem do site e não chama a rota de notificar", async () => {
    respostaCriar = {
      data: { ok: false, erro: "cupom_invalido", motivo: "valor_minimo", valor_minimo: "1000" },
      error: null,
      status: 200,
    };
    await abrir();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    const erro = await screen.findByTestId("erro-carrinho");
    expect(erro).toHaveTextContent(carrinhoSite.cupomValorMinimo.replace("{valor}", "R$ 1.000,00"));
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pedido-concluido")).toBeNull();
  });

  it("bloqueio do criar_pedido mostra a mensagem do site", async () => {
    respostaCriar = { data: { ok: false, erro: "itens_invalidos" }, error: null, status: 200 };
    await abrir();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    expect(await screen.findByTestId("erro-carrinho")).toHaveTextContent(carrinhoSite.bloqueioItensInvalidos);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sem resposta do banco: orienta a conferir em Meus pedidos", async () => {
    respostaCriar = { data: null, error: { message: "FetchError" }, status: 0 };
    await abrir();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    expect(await screen.findByTestId("erro-carrinho")).toHaveTextContent(carrinhoSite.erroGerarIncerto, {
      exact: false,
    });
    await fireEvent.press(screen.getByText(carrinhoSite.irMeusPedidos));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pedidos");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sem endereço: mensagem do site, link para cadastrar e botão desabilitado", async () => {
    simAtual = simulacao({ bloqueios: ["sem_endereco"] });
    await abrir();
    expect(screen.getByText(carrinhoSite.bloqueioSemEndereco)).toBeTruthy();
    expect(screen.getByTestId("cadastrar-endereco")).toBeTruthy();
    expect(screen.getByTestId("gerar-pedido")).toBeDisabled();
  });

  it("cupom inválido na simulação: mensagem do site e botão desabilitado", async () => {
    await abrir();
    simAtual = simulacao({ cupom: { codigo: "XPTO", situacao: "invalido", motivo: "esgotado", valor_minimo: null } });
    await fireEvent.changeText(screen.getByTestId("campo-cupom"), "XPTO");
    await fireEvent.press(screen.getByTestId("aplicar-cupom"));
    expect(await screen.findByTestId("mensagem-cupom")).toHaveTextContent(carrinhoSite.cupomEsgotado);
    expect(falso.rpc).toHaveBeenLastCalledWith("simular_pedido", { p_cupom: "XPTO" });
    expect(screen.getByTestId("gerar-pedido")).toBeDisabled();
  });

  it("cupom aplicado vai junto no criar_pedido", async () => {
    await abrir();
    simAtual = simulacao({
      desconto_origem: "cupom",
      cupom: { codigo: "NEX10", situacao: "aplicado", motivo: null, valor_minimo: null },
    });
    await fireEvent.changeText(screen.getByTestId("campo-cupom"), "NEX10");
    await fireEvent.press(screen.getByTestId("aplicar-cupom"));
    expect(await screen.findByText(carrinhoSite.cupomAplicado.replace("{codigo}", "NEX10"))).toBeTruthy();
    await fireEvent.press(screen.getByTestId("gerar-pedido"));
    await screen.findByTestId("pedido-concluido");
    expect(falso.rpc).toHaveBeenCalledWith("criar_pedido", { p_cupom: "NEX10", p_observacao: undefined });
  });

  it("item indisponível mostra o aviso do site", async () => {
    simAtual = simulacao({
      itens: [{ ...simulacao().itens[0], valido: false, motivo: "sem_preco", preco_unitario: null }],
      bloqueios: ["itens_invalidos"],
    });
    await abrir();
    expect(screen.getByText(carrinhoSite.itemSemPreco)).toBeTruthy();
    expect(screen.getByText(carrinhoSite.bloqueioItensInvalidos)).toBeTruthy();
    expect(screen.getByTestId("gerar-pedido")).toBeDisabled();
  });

  it("+ no stepper grava a nova quantidade filtrando pelo usuário e recalcula", async () => {
    falso.respostas.carrinho_itens = { data: [{ produto_id: "a" }], error: null };
    await abrir();
    const antes = falso.rpc.mock.calls.length;
    await fireEvent.press(screen.getByTestId("aumentar-a"));
    await waitFor(() => expect(falso.rpc.mock.calls.length).toBeGreaterThan(antes));
    const update = falso.chamadas.find((c) => c.tabela === "carrinho_itens" && c.metodo === "update");
    expect(update?.args).toEqual([{ quantidade: 3 }]);
    expect(falso.filtros("carrinho_itens")).toEqual([
      ["lojista_id", "u1"],
      ["produto_id", "a"],
    ]);
  });

  it("remover apaga só a linha do usuário", async () => {
    falso.respostas.carrinho_itens = { data: null, error: null };
    await abrir();
    simAtual = simulacao({ itens: [], bloqueios: ["carrinho_vazio"] });
    await act(async () => {
      await fireEvent.press(screen.getByTestId("remover-a"));
    });
    expect(await screen.findByTestId("carrinho-vazio")).toBeTruthy();
    expect(falso.chamadas.some((c) => c.tabela === "carrinho_itens" && c.metodo === "delete")).toBe(true);
    expect(falso.filtros("carrinho_itens")).toContainEqual(["lojista_id", "u1"]);
  });

  it("erro ao carregar mostra a tela de erro com nova tentativa", async () => {
    falso.rpc.mockResolvedValueOnce({ data: null, error: { message: "x" }, status: 500 });
    await render(<TelaCarrinho />);
    expect(await screen.findByTestId("carrinho-erro")).toBeTruthy();
    await fireEvent.press(screen.getByText("Tentar novamente"));
    expect(await screen.findByTestId("tela-carrinho")).toBeTruthy();
  });
});
