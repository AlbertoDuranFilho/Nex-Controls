import { act, render, screen } from "@testing-library/react-native";
import { AdicionarAoCarrinho } from "@/components/AdicionarAoCarrinho";

const mockAdicionar = jest.fn();
const mockAtualizarContagem = jest.fn(async () => {});

jest.mock("@/lib/supabase", () => ({ SITE_URL: "https://exemplo.test", supabase: {} }));
jest.mock("@/lib/carrinho", () => ({
  ...jest.requireActual("@/lib/carrinho"),
  adicionarAoCarrinho: (...a: unknown[]) => mockAdicionar(...a),
}));
jest.mock("@/lib/contagem-carrinho", () => ({
  useContagemCarrinho: () => ({ contagem: 0, atualizarContagem: mockAtualizarContagem, definirContagem: jest.fn() }),
}));
// Botão simples que nunca se desabilita: o teste chama o mesmo onPress (closure antiga)
// duas vezes, como dois toques no mesmo quadro antes de a tela renderizar de novo.
jest.mock("@/components/ui/Botao", () => {
  const { createElement } = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    Botao: (p: { testID?: string; titulo: string; onPress?: () => void }) =>
      createElement(Text, { testID: p.testID, onPress: p.onPress }, p.titulo),
  };
});

function adiado() {
  let concluir: (v: unknown) => void = () => {};
  const promessa = new Promise((ok) => (concluir = ok));
  return { promessa, concluir };
}

beforeEach(() => {
  mockAdicionar.mockReset();
  mockAtualizarContagem.mockClear();
});

describe("AdicionarAoCarrinho", () => {
  it("dois toques no mesmo instante enviam uma só vez", async () => {
    const envio = adiado();
    mockAdicionar.mockReturnValue(envio.promessa);
    await render(<AdicionarAoCarrinho produtoId="p1" />);
    const onPress = screen.getByTestId("adicionar-p1").props.onPress as () => void;
    await act(async () => {
      onPress();
      onPress();
    });
    expect(mockAdicionar).toHaveBeenCalledTimes(1);
    await act(async () => envio.concluir({ ok: true, quantidade: 1 }));
    expect(mockAtualizarContagem).toHaveBeenCalledTimes(1);
  });

  it("atualiza o contador da aba mesmo se sair da tela durante o envio", async () => {
    const envio = adiado();
    mockAdicionar.mockReturnValue(envio.promessa);
    await render(<AdicionarAoCarrinho produtoId="p1" />);
    const onPress = screen.getByTestId("adicionar-p1").props.onPress as () => void;
    await act(async () => onPress());
    await screen.unmount();
    await act(async () => envio.concluir({ ok: true, quantidade: 1 }));
    expect(mockAtualizarContagem).toHaveBeenCalledTimes(1);
  });

  it("falha não atualiza o contador e libera novo envio", async () => {
    mockAdicionar.mockResolvedValue({ ok: false, erro: "indisponivel" });
    await render(<AdicionarAoCarrinho produtoId="p1" />);
    const onPress = screen.getByTestId("adicionar-p1").props.onPress as () => void;
    await act(async () => onPress());
    await act(async () => onPress());
    expect(mockAdicionar).toHaveBeenCalledTimes(2);
    expect(mockAtualizarContagem).not.toHaveBeenCalled();
  });
});
