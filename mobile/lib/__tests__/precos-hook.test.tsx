import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { usePrecosCliente } from "@/lib/precos";
import type { ValorSessao } from "@/lib/sessao";

const mockRpc = jest.fn();
const mockSessao = { valor: {} as Partial<ValorSessao> };

jest.mock("@/lib/sessao", () => ({ useSessao: () => mockSessao.valor }));
jest.mock("@/lib/supabase", () => ({
  SITE_URL: "https://site.test",
  supabase: { rpc: (...a: unknown[]) => mockRpc(...a) },
}));

const IDS = ["a"];

function Sonda() {
  const p = usePrecosCliente(IDS);
  return <Text testID="estado">{p.estadoDe("a").tipo}</Text>;
}

function lojista() {
  mockSessao.valor = { carregando: false, papel: "lojista", lojistaAtivo: true, usuarioId: "u1" };
}

const LINHA = { produto_id: "a", preco_tabela: 100, preco_final: 90, desconto_percentual: 10 };

describe("usePrecosCliente ao sair e entrar de novo", () => {
  it("não mostra os preços antigos enquanto a nova busca não volta", async () => {
    lojista();
    mockRpc.mockResolvedValueOnce({ data: [LINHA], error: null });
    const r = await render(<Sonda />);
    expect(await screen.findByText("preco")).toBeTruthy();

    // saiu: visitante
    mockSessao.valor = { carregando: false, papel: "visitante", lojistaAtivo: false, usuarioId: null };
    await r.rerender(<Sonda />);
    expect(screen.getByTestId("estado")).toHaveTextContent("visitante");

    // entrou de novo (mesmo usuário); a busca fica pendente
    let resolver: (v: unknown) => void = () => {};
    mockRpc.mockReturnValueOnce(new Promise((res) => (resolver = res)));
    lojista();
    await r.rerender(<Sonda />);
    expect(screen.getByTestId("estado")).toHaveTextContent("carregando");

    await act(async () => resolver({ data: [LINHA], error: null }));
    expect(screen.getByTestId("estado")).toHaveTextContent("preco");
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("ficar inativo também esquece os preços", async () => {
    lojista();
    mockRpc.mockResolvedValueOnce({ data: [LINHA], error: null });
    const r = await render(<Sonda />);
    expect(await screen.findByText("preco")).toBeTruthy();

    mockSessao.valor = { ...mockSessao.valor, lojistaAtivo: false };
    await r.rerender(<Sonda />);
    expect(screen.getByTestId("estado")).toHaveTextContent("consulta");

    mockRpc.mockReturnValueOnce(new Promise(() => {}));
    lojista();
    await r.rerender(<Sonda />);
    expect(screen.getByTestId("estado")).toHaveTextContent("carregando");
  });
});
