import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import TelaProduto from "@/app/produto/[slug]";
import type { ValorSessao } from "@/lib/sessao";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

const mockSessao = { valor: {} as Partial<ValorSessao> };

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => ({ slug: "nx-100" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("@/lib/contagem-carrinho", () => ({
  useContagemCarrinho: () => ({ contagem: 0, atualizarContagem: jest.fn(), definirContagem: jest.fn() }),
}));
jest.mock("@/lib/sessao", () => ({ useSessao: () => mockSessao.valor }));
jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;
const abrirUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

beforeEach(() => {
  falso.limpar();
  abrirUrl.mockClear();
  falso.respostas.produtos = {
    data: {
      id: "a",
      slug: "nx-100",
      codigo: "NX-100",
      nome: "Controle remoto",
      destaque: null,
      compatibilidade: null,
      descricao: null,
      aplicacoes: null,
      manual_url: null,
      produto_imagens: [],
      produto_especificacoes: [],
    },
    error: null,
  };
});

function sessao(parcial: Partial<ValorSessao>) {
  mockSessao.valor = {
    carregando: false,
    papel: "visitante",
    lojistaAtivo: false,
    usuarioId: null,
    recarregarPerfil: jest.fn(),
    ...parcial,
  };
}

describe("Solicitar orçamento no produto", () => {
  it("visitante vê o botão abaixo de 'Entre para ver preços' e abre a mensagem com o código", async () => {
    sessao({});
    await render(<TelaProduto />);
    expect(await screen.findByText("Entre para ver preços")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("solicitar-orcamento"));
    const url = decodeURIComponent(String(abrirUrl.mock.calls[0][0]));
    expect(url).toMatch(/^mailto:contato@nexcontrols\.com/);
    expect(url).toContain("NX-100");
  });

  it("produto sem preço para o lojista ('Sob consulta') mostra o botão", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    falso.rpc.mockResolvedValue({ data: [], error: null });
    await render(<TelaProduto />);
    expect(await screen.findByText("Sob consulta")).toBeTruthy();
    expect(screen.getByTestId("solicitar-orcamento")).toBeTruthy();
  });

  it("com preço não mostra o botão", async () => {
    sessao({ papel: "lojista", lojistaAtivo: true, usuarioId: "u1" });
    falso.rpc.mockResolvedValue({
      data: [{ produto_id: "a", preco_tabela: 100, preco_final: 90, desconto_percentual: 10 }],
      error: null,
    });
    await render(<TelaProduto />);
    expect(await screen.findByTestId("preco-final")).toBeTruthy();
    expect(screen.queryByTestId("solicitar-orcamento")).toBeNull();
  });
});
