import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const createAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));
const notificarPedido = vi.fn();
vi.mock("@/services/pedidos", () => ({ notificarPedido: (...a: unknown[]) => notificarPedido(...a) }));

import { POST } from "@/src/app/api/app/pedidos/[id]/notificar/route";

const PEDIDO = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";

function banco(opts: { user?: string | null; pedido?: Record<string, unknown> | null }) {
  const filtros: [string, unknown][] = [];
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = (c: string, v: unknown) => (filtros.push([c, v]), q);
  q.maybeSingle = async () => {
    // simula o filtro por dono: só devolve se o lojista do pedido bate com o filtro
    const dono = filtros.find(([c]) => c === "lojista_id")?.[1];
    const p = opts.pedido;
    return { data: p && p.lojista_id === dono ? p : null, error: null };
  };
  return {
    auth: {
      getUser: async () =>
        opts.user
          ? { data: { user: { id: opts.user } }, error: null }
          : { data: { user: null }, error: { message: "x" } },
    },
    from: () => q,
  };
}

function chamar(token?: string, id = PEDIDO) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return POST(new Request("http://x/api", { method: "POST", headers }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  notificarPedido.mockResolvedValue(true);
});

describe("POST /api/app/pedidos/[id]/notificar", () => {
  it("401 sem token", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO }));
    expect((await chamar()).status).toBe(401);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("401 com token inválido", async () => {
    createAdminClient.mockReturnValue(banco({ user: null }));
    expect((await chamar("ruim")).status).toBe(401);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("404 para pedido de outro lojista", async () => {
    createAdminClient.mockReturnValue(
      banco({ user: USUARIO, pedido: { id: PEDIDO, lojista_id: "outro", notificado_em: null } }),
    );
    expect((await chamar("ok")).status).toBe(404);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("404 para pedido inexistente ou id inválido", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO, pedido: null }));
    expect((await chamar("ok")).status).toBe(404);
    expect((await chamar("ok", "nao-uuid")).status).toBe(404);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("já notificado não envia de novo", async () => {
    createAdminClient.mockReturnValue(
      banco({
        user: USUARIO,
        pedido: { id: PEDIDO, lojista_id: USUARIO, notificado_em: "2026-11-26T10:00:00Z" },
      }),
    );
    const r = await chamar("ok");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ jaNotificado: true });
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("caminho feliz notifica uma vez", async () => {
    createAdminClient.mockReturnValue(
      banco({ user: USUARIO, pedido: { id: PEDIDO, lojista_id: USUARIO, notificado_em: null } }),
    );
    const r = await chamar("ok");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ enviado: true });
    expect(notificarPedido).toHaveBeenCalledTimes(1);
    expect(notificarPedido).toHaveBeenCalledWith(PEDIDO);
  });
});
