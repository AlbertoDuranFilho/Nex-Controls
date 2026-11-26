import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ProductCard } from "@/components/ProductCard";
import type { ProdutoPublico } from "@/lib/catalogo";
import type { EstadoPreco } from "@/lib/precos";

const mockPush = jest.fn();
const mockAdicionar = jest.fn();
const mockAtualizarContagem = jest.fn(async () => {});

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/lib/supabase", () => ({ SITE_URL: "https://exemplo.test", supabase: {} }));
jest.mock("@/lib/carrinho", () => ({
  ...jest.requireActual("@/lib/carrinho"),
  adicionarAoCarrinho: (...a: unknown[]) => mockAdicionar(...a),
}));
jest.mock("@/lib/contagem-carrinho", () => ({
  useContagemCarrinho: () => ({ contagem: 0, atualizarContagem: mockAtualizarContagem, definirContagem: jest.fn() }),
}));

const produto: ProdutoPublico = {
  id: "p1",
  slug: "controle-x",
  codigo: "NX-100",
  nome: "Controle remoto de portão com nome bem comprido para testar duas linhas no cartão",
  destaque: "Alcance de 50 m",
  compatibilidade: null,
  descricao: null,
  aplicacoes: null,
  manual_url: null,
  imagens: [{ url: "https://img/1.png", alt: null }],
  especificacoes: [],
};

const semNbsp = (s: string) => s.replace(/ /g, " ");

async function renderizar(estado: EstadoPreco, p: ProdutoPublico = produto, onPress = jest.fn()) {
  await render(<ProductCard produto={p} estado={estado} onPress={onPress} />);
  return onPress;
}

beforeEach(() => {
  mockPush.mockReset();
  mockAdicionar.mockReset();
  mockAtualizarContagem.mockClear();
});

describe("ProductCard", () => {
  it("mantém o layout: nome (2 linhas), código e descrição; abre o produto", async () => {
    const onPress = await renderizar({ tipo: "visitante" });
    expect(screen.getByTestId("nome-produto").props.numberOfLines).toBe(2);
    expect(screen.getByText("NX-100")).toBeTruthy();
    expect(screen.getByText("Alcance de 50 m")).toBeTruthy();
    expect(screen.getByTestId("imagem-produto")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("abrir-p1"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("sem imagem mostra o ícone no lugar", async () => {
    await renderizar({ tipo: "visitante" }, { ...produto, imagens: [] });
    expect(screen.getByTestId("imagem-placeholder")).toBeTruthy();
    expect(screen.queryByTestId("imagem-produto")).toBeNull();
  });

  it("visitante: 'Entre para ver preços' vai ao login, sem preço nem botão", async () => {
    await renderizar({ tipo: "visitante" });
    expect(screen.queryByTestId("preco-final")).toBeNull();
    expect(screen.queryByTestId("adicionar-p1")).toBeNull();
    await fireEvent.press(screen.getByText("Entre para ver preços"));
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("sem preço (ou inativo): 'Sob consulta', sem botão", async () => {
    await renderizar({ tipo: "consulta" });
    expect(screen.getByText("Sob consulta")).toBeTruthy();
    expect(screen.queryByTestId("preco-final")).toBeNull();
    expect(screen.queryByTestId("adicionar-p1")).toBeNull();
    expect(screen.queryByText("Entre para ver preços")).toBeNull();
  });

  it("erro: nem preço, nem botão, nem 'Entre para ver preços'", async () => {
    await renderizar({ tipo: "erro" });
    expect(screen.queryByTestId("preco-final")).toBeNull();
    expect(screen.queryByTestId("adicionar-p1")).toBeNull();
    expect(screen.queryByText("Entre para ver preços")).toBeNull();
    expect(screen.queryByText("Sob consulta")).toBeNull();
  });

  it("com desconto: tabela riscada, selo -X% e preço final", async () => {
    await renderizar({ tipo: "preco", tabela: 200, final: 170, desconto: 15 });
    expect(semNbsp(screen.getByTestId("preco-tabela").props.children)).toBe("R$ 200,00");
    expect(screen.getByText("-15%")).toBeTruthy();
    expect(semNbsp(screen.getByTestId("preco-final").props.children)).toBe("R$ 170,00");
  });

  it("sem desconto: só o preço final", async () => {
    await renderizar({ tipo: "preco", tabela: 200, final: 200, desconto: 0 });
    expect(semNbsp(screen.getByTestId("preco-final").props.children)).toBe("R$ 200,00");
    expect(screen.queryByTestId("preco-tabela")).toBeNull();
    expect(screen.queryByTestId("selo-desconto")).toBeNull();
  });

  it("stepper e Adicionar: envia a quantidade e atualiza o contador da aba", async () => {
    mockAdicionar.mockResolvedValue({ ok: true, quantidade: 3 });
    await renderizar({ tipo: "preco", tabela: 10, final: 10, desconto: 0 });
    expect(screen.getByTestId("diminuir-p1").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("aumentar-p1"));
    await fireEvent.press(screen.getByTestId("aumentar-p1"));
    expect(screen.getByTestId("quantidade-p1").props.children).toBe(3);
    await fireEvent.press(screen.getByTestId("adicionar-p1"));
    await waitFor(() => expect(mockAtualizarContagem).toHaveBeenCalledTimes(1));
    expect(mockAdicionar).toHaveBeenCalledWith("p1", 3);
    expect(screen.getByText("Adicionado")).toBeTruthy();
  });

  it("falha ao adicionar mostra a mensagem e não atualiza o contador", async () => {
    mockAdicionar.mockResolvedValue({ ok: false, erro: "indisponivel" });
    await renderizar({ tipo: "preco", tabela: 10, final: 10, desconto: 0 });
    await fireEvent.press(screen.getByTestId("adicionar-p1"));
    expect(await screen.findByText("Não foi possível adicionar este produto agora.")).toBeTruthy();
    expect(mockAtualizarContagem).not.toHaveBeenCalled();
  });
});
