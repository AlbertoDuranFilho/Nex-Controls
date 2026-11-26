import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
const notificarPedido = vi.fn();
const after = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/services/pedidos", () => ({ notificarPedido: (id: string) => notificarPedido(id) }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => after(fn) }));

import { gerarPedido, simularCarrinho } from "./carrinho";

const SIM = {
  itens: [],
  subtotal: "0.00",
  desconto_cliente: "0",
  desconto_cupom: "0",
  desconto_aplicado: "0",
  desconto_origem: "nenhum",
  frete: "0",
  icms: "0",
  difal: "0",
  total: "0",
  cupom: { codigo: null, situacao: "ausente", motivo: null, valor_minimo: null },
  bloqueios: ["carrinho_vazio"],
};

function clienteFalso(opcoes: { user?: object | null; rpc?: { data: unknown; error: unknown } }) {
  const rpc = vi.fn(async () => opcoes.rpc ?? { data: null, error: null });
  createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: opcoes.user === undefined ? { id: "u" } : opcoes.user } }) },
    rpc,
  });
  return rpc;
}

beforeEach(() => {
  createClient.mockReset();
  notificarPedido.mockReset();
  after.mockReset();
});

describe("simularCarrinho", () => {
  it("sem sessão: sem_sessao (não chama o banco)", async () => {
    const rpc = clienteFalso({ user: null });
    expect(await simularCarrinho()).toEqual({ ok: false, motivo: "sem_sessao" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("erro do RPC: erro (não confunde com falta de sessão)", async () => {
    clienteFalso({ rpc: { data: null, error: { message: "boom" } } });
    expect(await simularCarrinho()).toEqual({ ok: false, motivo: "erro" });
  });

  it("sucesso: normaliza números", async () => {
    clienteFalso({ rpc: { data: SIM, error: null } });
    const r = await simularCarrinho();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sim.subtotal).toBe(0);
  });
});

describe("gerarPedido", () => {
  it("cupom_invalido repassa motivo e valor mínimo", async () => {
    clienteFalso({
      rpc: { data: { ok: false, erro: "cupom_invalido", motivo: "valor_minimo", valor_minimo: "1000.00" }, error: null },
    });
    expect(await gerarPedido("MIN", "")).toEqual({
      ok: false,
      erro: "cupom_invalido",
      motivo: "valor_minimo",
      valorMinimo: 1000,
    });
  });

  it("sucesso: responde sem esperar os e-mails (after) e falha só é registrada", async () => {
    clienteFalso({ rpc: { data: { ok: true, id: "p1", numero: 42 }, error: null } });
    notificarPedido.mockRejectedValue(new Error("resend fora"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await gerarPedido(null, "")).toEqual({ ok: true, numero: 42 });
    expect(notificarPedido).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);

    await after.mock.calls[0][0]();
    expect(notificarPedido).toHaveBeenCalledWith("p1");
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });
});
