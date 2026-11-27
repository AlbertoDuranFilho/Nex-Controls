const mockMemoria = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => (mockMemoria.has(k) ? mockMemoria.get(k)! : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`chave inválida: ${k}`);
    if (new TextEncoder().encode(v).length > 2048) throw new Error("valor grande demais");
    mockMemoria.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockMemoria.delete(k);
  }),
}));

import { armazenamentoSeguro, dividirEmPedacos, TAMANHO_PEDACO } from "../armazenamento";

beforeEach(() => mockMemoria.clear());

describe("armazenamentoSeguro", () => {
  it("guarda e lê uma sessão grande em pedaços (acima do limite de 2 KB)", async () => {
    const sessao = JSON.stringify({ token: "x".repeat(5000), nome: "Ação Comércio ÇÃÕ".repeat(200) });
    await armazenamentoSeguro.setItem("sb-abc-auth-token", sessao);
    expect(await armazenamentoSeguro.getItem("sb-abc-auth-token")).toBe(sessao);
    expect(Number(mockMemoria.get("sb-abc-auth-token.n"))).toBeGreaterThan(1);
  });

  it("devolve null quando não há nada salvo", async () => {
    expect(await armazenamentoSeguro.getItem("sb-abc-auth-token")).toBeNull();
  });

  it("ao regravar menor, apaga os pedaços que sobraram", async () => {
    await armazenamentoSeguro.setItem("k", "a".repeat(TAMANHO_PEDACO * 3));
    await armazenamentoSeguro.setItem("k", "curto");
    expect(await armazenamentoSeguro.getItem("k")).toBe("curto");
    expect(mockMemoria.has("k.1")).toBe(false);
    expect(mockMemoria.has("k.2")).toBe(false);
  });

  it("removeItem apaga tudo", async () => {
    await armazenamentoSeguro.setItem("k", "b".repeat(TAMANHO_PEDACO * 2 + 5));
    await armazenamentoSeguro.removeItem("k");
    expect(mockMemoria.size).toBe(0);
    expect(await armazenamentoSeguro.getItem("k")).toBeNull();
  });

  it("pedaço faltando é tratado como sem sessão", async () => {
    await armazenamentoSeguro.setItem("k", "c".repeat(TAMANHO_PEDACO * 2));
    mockMemoria.delete("k.1");
    expect(await armazenamentoSeguro.getItem("k")).toBeNull();
  });

  it("troca caracteres não aceitos na chave", async () => {
    await armazenamentoSeguro.setItem("sb:chave/estranha", "v");
    expect(await armazenamentoSeguro.getItem("sb:chave/estranha")).toBe("v");
  });
});

describe("dividirEmPedacos", () => {
  it("não corta emoji (par substituto) ao meio", () => {
    const texto = "a".repeat(9) + "😀" + "b";
    const pedacos = dividirEmPedacos(texto, 10);
    expect(pedacos.join("")).toBe(texto);
    expect(pedacos[0]).toBe("a".repeat(9));
  });
});
