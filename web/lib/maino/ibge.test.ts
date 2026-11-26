import { describe, expect, it, vi } from "vitest";
import { buscarIbgePorCep } from "./ibge";

describe("buscarIbgePorCep", () => {
  it("devolve o código IBGE", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ibge: "2611606" })));
    expect(await buscarIbgePorCep("50010-000", f as unknown as typeof fetch)).toBe(2611606);
    expect(f.mock.calls[0][0]).toBe("https://viacep.com.br/ws/50010000/json/");
  });
  it("erro:true vira null", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: true })));
    expect(await buscarIbgePorCep("00000000", f as unknown as typeof fetch)).toBeNull();
  });
  it("falha de rede vira null", async () => {
    const f = vi.fn().mockRejectedValue(new Error("x"));
    expect(await buscarIbgePorCep("50010000", f as unknown as typeof fetch)).toBeNull();
  });
  it("CEP inválido vira null sem chamar", async () => {
    const f = vi.fn();
    expect(await buscarIbgePorCep("123", f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
