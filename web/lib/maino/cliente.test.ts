import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { lerConfigMaino } from "./config";
import { chamarMaino, type TokenStore } from "./cliente";

const cfg = lerConfigMaino({
  MAINO_APPLICATION_UID: "uid-segredo",
  MAINO_EMAIL: "api@nex.com",
  MAINO_SENHA: "senha-secreta",
} as unknown as NodeJS.ProcessEnv)!;

function resposta(status: number, corpo?: unknown, headers: Record<string, string> = {}) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function loja(inicial: string | null = null) {
  let token = inicial;
  const gravar = vi.fn(async (t: string) => {
    token = t;
  });
  const store: TokenStore = { ler: async () => token, gravar };
  return { store, gravar };
}

describe("lerConfigMaino", () => {
  it("retorna null sem credenciais", () => {
    expect(lerConfigMaino({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("aplica padrões", () => {
    expect(cfg.apiUrl).toBe("https://api.maino.com.br/api/v2");
    expect(cfg.modalidadeFrete).toBe(9);
    expect(cfg.condicaoPagamentoId).toBeUndefined();
  });
});

describe("chamarMaino", () => {
  it("faz login e chama com Bearer", async () => {
    const { store, gravar } = loja();
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(200, { access_token: "tok1" }))
      .mockResolvedValueOnce(resposta(200, { id: 7 }));
    const r = await chamarMaino<{ id: number }>(cfg, "POST", "/pedidos", { a: 1 }, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r).toEqual({ ok: true, status: 200, dados: { id: 7 } });
    expect(gravar).toHaveBeenCalledWith("tok1");
    expect(f.mock.calls[0][0]).toBe("https://api.maino.com.br/api/v2/authentication");
    expect(f.mock.calls[1][1].headers.Authorization).toBe("Bearer tok1");
  });

  it("reaproveita token em cache sem login", async () => {
    const { store } = loja("cache");
    const f = vi.fn().mockResolvedValueOnce(resposta(200, { ok: 1 }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer cache");
  });

  it("401 refaz login e tem sucesso", async () => {
    const { store } = loja("velho");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, { error: "expirado" }))
      .mockResolvedValueOnce(resposta(200, { access_token: "novo" }))
      .mockResolvedValueOnce(resposta(200, { ok: 1 }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok).toBe(true);
    expect(f.mock.calls[2][1].headers.Authorization).toBe("Bearer novo");
  });

  it("401 duas vezes vira erro", async () => {
    const { store } = loja("velho");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, { error: "x" }))
      .mockResolvedValueOnce(resposta(200, { access_token: "novo" }))
      .mockResolvedValueOnce(resposta(401, { error: "não autorizado" }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r).toMatchObject({ ok: false, status: 401, erro: "não autorizado" });
  });

  it("429 espera Retry-After e repete", async () => {
    const { store } = loja("t");
    const esperar = vi.fn(async () => {});
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(429, { error: "muitas" }, { "Retry-After": "2" }))
      .mockResolvedValueOnce(resposta(200, { ok: 1 }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar,
    });
    expect(r.ok).toBe(true);
    expect(esperar).toHaveBeenCalledWith(2000);
  });

  it("401 -> re-login -> 429 repete com o token novo", async () => {
    const { store } = loja("velho");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(401, { error: "x" }))
      .mockResolvedValueOnce(resposta(200, { access_token: "novo" }))
      .mockResolvedValueOnce(resposta(429, {}, { "Retry-After": "1" }))
      .mockResolvedValueOnce(resposta(200, { ok: 1 }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok).toBe(true);
    expect(f.mock.calls[3][1].headers.Authorization).toBe("Bearer novo");
  });

  it("429 limita a espera a 5 s", async () => {
    const { store } = loja("t");
    const esperar = vi.fn(async () => {});
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(429, {}, { "Retry-After": "60" }))
      .mockResolvedValueOnce(resposta(200, {}));
    await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar,
    });
    expect(esperar).toHaveBeenCalledWith(5000);
  });

  it("422 achata errors", async () => {
    const { store } = loja("t");
    const f = vi
      .fn()
      .mockResolvedValueOnce(resposta(422, { errors: { "cliente.cnpj": ["inválido"] } }));
    const r = await chamarMaino(cfg, "POST", "/pedidos", {}, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r).toEqual({ ok: false, status: 422, erro: "cliente.cnpj: inválido" });
  });

  it("204 devolve dados null", async () => {
    const { store } = loja("t");
    const f = vi.fn().mockResolvedValueOnce(resposta(204));
    const r = await chamarMaino(cfg, "DELETE", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r).toEqual({ ok: true, status: 204, dados: null });
  });

  it("timeout vira status 0", async () => {
    const { store } = loja("t");
    const f = vi.fn().mockRejectedValueOnce(new DOMException("t", "TimeoutError"));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r).toEqual({ ok: false, status: 0, erro: "Mainô não respondeu a tempo." });
  });

  it("erro de rede vira status 0", async () => {
    const { store } = loja("t");
    const f = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
  });

  it("corpo de login nunca aparece em erro", async () => {
    const { store } = loja();
    const f = vi.fn().mockResolvedValueOnce(resposta(422, { error: "credenciais inválidas" }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok).toBe(false);
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("senha-secreta");
    expect(texto).not.toContain("uid-segredo");
    expect(texto).not.toContain("api@nex.com");
  });

  it("corta erro em 500 caracteres", async () => {
    const { store } = loja("t");
    const f = vi.fn().mockResolvedValueOnce(resposta(400, { error: "a".repeat(900) }));
    const r = await chamarMaino(cfg, "GET", "/x", undefined, {
      fetch: f as unknown as typeof fetch,
      tokens: store,
      esperar: async () => {},
    });
    expect(r.ok === false && r.erro.length).toBe(500);
  });
});
