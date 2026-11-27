import { act, render, screen } from "@testing-library/react-native";
import TelaCarrinho from "@/app/(abas)/carrinho";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
// funções estáveis entre renderizações, como no provedor real
const mockContagem = { contagem: 0, atualizarContagem: jest.fn(async () => {}), definirContagem: jest.fn() };
jest.mock("@/lib/contagem-carrinho", () => ({
  ...jest.requireActual("@/lib/contagem-carrinho"),
  useContagemCarrinho: () => mockContagem,
}));
jest.mock("@/lib/sessao", () => ({
  useSessao: () => ({ carregando: false, papel: "lojista", lojistaAtivo: true, usuarioId: "u1" }),
}));
jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});
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

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;
const fetchFalso = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ enviado: true }) }));

const SIM = {
  itens: [
    {
      produto_id: "a",
      codigo: "NX-100",
      nome: "Controle remoto",
      quantidade: 2,
      preco_tabela: 100,
      desconto_percentual: 0,
      preco_unitario: 100,
      total_linha: 200,
      valido: true,
      motivo: null,
    },
  ],
  subtotal: 200,
  desconto_cliente: 0,
  desconto_cupom: 0,
  desconto_aplicado: 0,
  desconto_origem: "nenhum",
  frete: 0,
  icms: 0,
  difal: 0,
  total: 200,
  cupom: { codigo: null, situacao: "ausente", motivo: null, valor_minimo: null },
  bloqueios: [],
};

it("dois toques em Gerar pedido no mesmo instante criam um pedido só", async () => {
  globalThis.fetch = fetchFalso as unknown as typeof fetch;
  let liberar: (v: unknown) => void = () => {};
  falso.respostas.produtos = { data: [], error: null };
  falso.rpc.mockImplementation((nome: string) => {
    if (nome === "simular_pedido") return Promise.resolve({ data: SIM, error: null, status: 200 });
    if (nome === "criar_pedido") return new Promise((res) => (liberar = res));
    return Promise.resolve({ data: null, error: { message: "?" } });
  });
  await render(<TelaCarrinho />);
  const onPress = (await screen.findByTestId("gerar-pedido")).props.onPress as () => void;
  await act(async () => {
    onPress();
    onPress();
  });
  await act(async () => liberar({ data: { ok: true, id: "pedido-1", numero: 1042 }, error: null, status: 200 }));
  expect(await screen.findByTestId("pedido-concluido")).toBeTruthy();
  expect(falso.rpc.mock.calls.filter((c) => c[0] === "criar_pedido")).toHaveLength(1);
  expect(fetchFalso).toHaveBeenCalledTimes(1);
});
