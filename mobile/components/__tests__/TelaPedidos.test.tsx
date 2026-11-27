import { fireEvent, render, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import TelaPedidos from "@/app/(abas)/pedidos";
import TelaPedido from "@/app/pedido/[numero]";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

const mockRouter = { push: jest.fn(), navigate: jest.fn() };
const mockParams = { valor: {} as Record<string, string> };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams.valor,
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
    Stack: { Screen: () => null },
  };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-web-browser",() => ({ openBrowserAsync: jest.fn(async () => ({ type: "dismiss" })) }));
jest.mock("@/lib/sessao", () => ({
  useSessao: () => ({
    carregando: false,
    papel: "lojista",
    lojistaAtivo: true,
    usuarioId: "u1",
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

function pedido(parcial: Record<string, unknown> = {}) {
  return {
    id: "p1",
    numero: 1042,
    created_at: "2026-11-26T12:00:00Z",
    status: "faturado",
    total: 180,
    subtotal: 200,
    desconto_valor: 20,
    desconto_origem: "cliente",
    frete_valor: 0,
    observacao: "Entregar de manhã",
    maino_nota_url: "https://maino.test/danfe.pdf",
    nfe_status: "ACEITA",
    entrega_logradouro: "Rua A",
    entrega_numero: "10",
    entrega_complemento: null,
    entrega_bairro: "Centro",
    entrega_cidade: "Recife",
    entrega_uf: "PE",
    entrega_cep: "50000-000",
    pedido_itens: [{ produto_codigo: "NX-100", produto_nome: "Controle remoto", quantidade: 2, preco_unitario: 90 }],
    ...parcial,
  };
}

beforeEach(() => {
  falso.limpar();
  mockRouter.push.mockClear();
  mockRouter.navigate.mockClear();
  (WebBrowser.openBrowserAsync as jest.Mock).mockClear();
  mockParams.valor = { numero: "1042" };
});

describe("Lista de pedidos", () => {
  it("mostra cartões com número, status colorido e total, só do usuário", async () => {
    falso.respostas.pedidos = {
      data: [
        { numero: 1042, created_at: "2026-11-26T12:00:00Z", status: "enviado", total: 180 },
        { numero: 1041, created_at: "2026-11-20T12:00:00Z", status: "cancelado", total: 50 },
      ],
      error: null,
    };
    await render(<TelaPedidos />);
    expect(await screen.findByText("Pedido #1042")).toBeTruthy();
    expect(screen.getByText("Enviado")).toBeTruthy();
    expect(screen.getByText("Cancelado")).toBeTruthy();
    expect(falso.filtros("pedidos")).toContainEqual(["lojista_id", "u1"]);
    await fireEvent.press(screen.getByTestId("pedido-1042"));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/pedido/[numero]", params: { numero: "1042" } });
  });

  it("sem pedidos mostra o estado vazio", async () => {
    falso.respostas.pedidos = { data: [], error: null };
    await render(<TelaPedidos />);
    expect(await screen.findByTestId("pedidos-vazio")).toBeTruthy();
    expect(screen.getByText("Você ainda não fez pedidos.")).toBeTruthy();
  });

  it("erro mostra tela com nova tentativa", async () => {
    falso.respostas.pedidos = { data: null, error: { message: "x" } };
    await render(<TelaPedidos />);
    expect(await screen.findByTestId("pedidos-erro")).toBeTruthy();
  });
});

describe("Detalhe do pedido", () => {
  it("itens, totais, entrega, linha do tempo e nota fiscal https", async () => {
    falso.respostas.pedidos = { data: pedido(), error: null };
    falso.respostas.pedido_eventos = {
      data: [
        { id: "e1", status_de: "aguardando_pagamento", status_para: "pago", criado_em: "2026-11-26T13:00:00Z" },
        { id: "e2", status_de: "pago", status_para: "faturado", criado_em: "2026-11-26T14:00:00Z" },
      ],
      error: null,
    };
    await render(<TelaPedido />);
    expect(await screen.findByTestId("tela-pedido")).toBeTruthy();
    expect(screen.getByText("Controle remoto")).toBeTruthy();
    expect(screen.getByText("Seu desconto")).toBeTruthy();
    expect(screen.getByText("a combinar")).toBeTruthy();
    expect(screen.getByText("Rua A, 10 — Centro, Recife/PE — CEP 50000-000")).toBeTruthy();
    expect(screen.getAllByTestId("marco")).toHaveLength(3);
    expect(falso.filtros("pedidos")).toEqual(
      expect.arrayContaining([
        ["numero", 1042],
        ["lojista_id", "u1"],
      ]),
    );
    expect(screen.queryByTestId("confirmacao")).toBeNull();
    await fireEvent.press(screen.getByTestId("ver-nota"));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://maino.test/danfe.pdf");
  });

  it("DANFE http não aparece", async () => {
    falso.respostas.pedidos = { data: pedido({ maino_nota_url: "http://maino.test/danfe.pdf" }), error: null };
    falso.respostas.pedido_eventos = { data: [], error: null };
    await render(<TelaPedido />);
    await screen.findByTestId("tela-pedido");
    expect(screen.queryByTestId("ver-nota")).toBeNull();
    expect(screen.getByText("Nenhuma mudança de status ainda.")).toBeTruthy();
  });

  it("nota cancelada mostra o aviso no lugar do link", async () => {
    falso.respostas.pedidos = { data: pedido({ nfe_status: "CANCELADA" }), error: null };
    falso.respostas.pedido_eventos = { data: [], error: null };
    await render(<TelaPedido />);
    expect(await screen.findByTestId("nota-cancelada")).toBeTruthy();
    expect(screen.queryByTestId("ver-nota")).toBeNull();
  });

  it("pedido recém-criado mostra a confirmação do site", async () => {
    mockParams.valor = { numero: "1042", novo: "1" };
    falso.respostas.pedidos = { data: pedido(), error: null };
    falso.respostas.pedido_eventos = { data: [], error: null };
    await render(<TelaPedido />);
    expect(await screen.findByTestId("confirmacao")).toBeTruthy();
  });

  it("pedido de outro cliente ou número inválido → não encontrado", async () => {
    falso.respostas.pedidos = { data: null, error: null };
    await render(<TelaPedido />);
    expect(await screen.findByTestId("pedido-nao-encontrado")).toBeTruthy();

    mockParams.valor = { numero: "abc" };
    falso.chamadas.length = 0;
    await render(<TelaPedido />);
    expect(await screen.findAllByTestId("pedido-nao-encontrado")).toBeTruthy();
    expect(falso.chamadas).toHaveLength(0);
  });
});
