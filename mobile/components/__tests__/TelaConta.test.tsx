import { fireEvent, render, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";
import type { AlertButton } from "react-native";
import TelaConta from "@/app/(abas)/conta";
import { linkEmail, linkWhatsApp } from "@/lib/contato";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

const mockSair = jest.fn(async () => {});

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({ type: "dismiss" })) }));
jest.mock("@/lib/sessao", () => ({
  useSessao: () => ({
    carregando: false,
    papel: "lojista",
    lojistaAtivo: true,
    usuarioId: "u1",
    email: "loja@teste.com",
    sair: mockSair,
    recarregarPerfil: jest.fn(),
  }),
}));
jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;
const abrirUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const cadastro = {
  nome: "Loja Exemplo LTDA",
  documento: "12345678000199",
  nome_fantasia: "Loja Exemplo",
  responsavel_nome: "Ana",
  telefone: "8133334444",
  whatsapp: "81999990000",
  indicador_ie: "isento",
  inscricao_estadual: null,
  email: "loja@teste.com",
  cep: "50000000",
  logradouro: "Rua A",
  numero: "10",
  complemento: null,
  bairro: "Centro",
  cidade: "Recife",
  uf: "PE",
};

beforeEach(() => {
  falso.limpar();
  abrirUrl.mockClear();
  alerta.mockClear();
  mockSair.mockClear();
  (WebBrowser.openBrowserAsync as jest.Mock).mockClear();
  falso.respostas.lojistas = { data: cadastro, error: null };
});

describe("Conta", () => {
  it("mostra dados e endereço do próprio cadastro (filtro id = usuário)", async () => {
    await render(<TelaConta />);
    expect(await screen.findByTestId("meus-dados")).toBeTruthy();
    expect(falso.filtros("lojistas")).toContainEqual(["id", "u1"]);
    expect(screen.getByText("12.345.678/0001-99")).toBeTruthy();
    expect(screen.getByText("(81) 99999-0000")).toBeTruthy();
    expect(screen.getByText("Isento")).toBeTruthy();
    expect(screen.getByText("Rua A, 10")).toBeTruthy();
    expect(screen.getByText("CEP 50000-000")).toBeTruthy();
  });

  it("sem endereço completo avisa", async () => {
    falso.respostas.lojistas = { data: { ...cadastro, logradouro: null }, error: null };
    await render(<TelaConta />);
    expect(await screen.findByText("Nenhum endereço cadastrado.")).toBeTruthy();
  });

  it("Fale conosco abre e-mail para contato@nexcontrols.com (sem WhatsApp publicado)", async () => {
    await render(<TelaConta />);
    await fireEvent.press(await screen.findByTestId("fale-conosco"));
    expect(abrirUrl).toHaveBeenCalledWith(expect.stringMatching(/^mailto:contato@nexcontrols\.com\?subject=/));
  });

  it("política de privacidade abre a página do site no navegador do app", async () => {
    await render(<TelaConta />);
    await fireEvent.press(await screen.findByTestId("politica"));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://site.test/pt/privacy-policy");
  });

  it("Excluir minha conta confirma e abre o pedido de exclusão com o e-mail da conta", async () => {
    await render(<TelaConta />);
    await fireEvent.press(await screen.findByTestId("excluir-conta"));
    expect(alerta).toHaveBeenCalled();
    const botoes = alerta.mock.calls[0][2] as AlertButton[];
    expect(abrirUrl).not.toHaveBeenCalled();
    botoes.find((b) => b.style === "destructive")?.onPress?.();
    await new Promise((r) => setTimeout(r, 0));
    const url = decodeURIComponent(String(abrirUrl.mock.calls[0][0]));
    expect(url).toContain("mailto:contato@nexcontrols.com");
    expect(url).toContain("Pedido de exclusão de conta");
    expect(url).toContain("loja@teste.com");

    // o mesmo aviso leva à página pública de exclusão (a URL informada na Google Play)
    botoes.find((b) => b.text === "Ver como funciona")?.onPress?.();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://site.test/pt/excluir-conta");
  });

  it("erro ao carregar dados ainda deixa contato, privacidade e sair", async () => {
    falso.respostas.lojistas = { data: null, error: { message: "x" } };
    await render(<TelaConta />);
    expect(await screen.findByTestId("conta-erro")).toBeTruthy();
    expect(screen.getByTestId("fale-conosco")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("sair"));
    expect(mockSair).toHaveBeenCalled();
  });
});

describe("links de contato", () => {
  it("WhatsApp com o texto codificado e só dígitos no número", () => {
    expect(linkWhatsApp("+55 (81) 99999-0000", "Orçamento NX-1")).toBe(
      "https://wa.me/5581999990000?text=Or%C3%A7amento%20NX-1",
    );
  });

  it("e-mail com assunto e corpo codificados", () => {
    expect(linkEmail("contato@nexcontrols.com", { assunto: "Olá & tchau", texto: "a b" })).toBe(
      "mailto:contato@nexcontrols.com?subject=Ol%C3%A1%20%26%20tchau&body=a%20b",
    );
  });
});
