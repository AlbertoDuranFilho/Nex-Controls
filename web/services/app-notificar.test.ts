import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const createAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));
const notificarPedido = vi.fn();
vi.mock("@/services/pedidos", () => ({ notificarPedido: (...a: unknown[]) => notificarPedido(...a) }));

import { POST } from "@/src/app/api/app/pedidos/[id]/notificar/route";

const PEDIDO = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";

type Linha = { id: string; lojista_id: string; notificado_em: string | null };

// Banco falso com estado: update com filtros é atômico (síncrono) como no Postgres.
function banco(opts: { user?: string | null; linha?: Linha | null; erro?: "update" | "select" }) {
  const linha = opts.linha ?? null;
  const getUser = vi.fn(async (token: string) =>
    opts.user && token
      ? { data: { user: { id: opts.user } }, error: null }
      : { data: { user: null }, error: { message: "x" } },
  );
  function from() {
    const f: Record<string, unknown> = {};
    const filtros: [string, unknown][] = [];
    const exige: string[] = [];
    let patch: Partial<Linha> | null = null;
    const casa = () =>
      !!linha &&
      filtros.every(([c, v]) => (linha as Record<string, unknown>)[c] === v) &&
      exige.every((c) => (linha as Record<string, unknown>)[c] === null);
    f.update = (p: Partial<Linha>) => ((patch = p), f);
    f.select = () => f;
    f.eq = (c: string, v: unknown) => (filtros.push([c, v]), f);
    f.is = (c: string) => (exige.push(c), f);
    f.maybeSingle = async () =>
      opts.erro === "select"
        ? { data: null, error: { message: "boom" } }
        : { data: casa() ? linha : null, error: null };
    f.then = (r: (v: unknown) => unknown) => {
      if (opts.erro === "update" && patch?.notificado_em) {
        return Promise.resolve({ data: null, error: { message: "boom" } }).then(r);
      }
      let data: { id: string }[] = [];
      if (patch && casa()) {
        Object.assign(linha!, patch);
        data = [{ id: linha!.id }];
      }
      return Promise.resolve({ data, error: null }).then(r);
    };
    return f;
  }
  return { auth: { getUser }, from, getUser };
}

function chamar(token?: string, id = PEDIDO) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return POST(new Request("http://x/api", { method: "POST", headers }), {
    params: Promise.resolve({ id }),
  });
}

const nova = (): Linha => ({ id: PEDIDO, lojista_id: USUARIO, notificado_em: null });

beforeEach(() => {
  vi.clearAllMocks();
  notificarPedido.mockResolvedValue(true);
});

describe("POST /api/app/pedidos/[id]/notificar", () => {
  it("401 sem token", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha: nova() }));
    expect((await chamar()).status).toBe(401);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("401 com token inválido e valida com o token recebido", async () => {
    const b = banco({ user: null });
    createAdminClient.mockReturnValue(b);
    expect((await chamar("ruim")).status).toBe(401);
    expect(b.getUser).toHaveBeenCalledWith("ruim");
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("404 para pedido de outro lojista", async () => {
    createAdminClient.mockReturnValue(
      banco({ user: USUARIO, linha: { ...nova(), lojista_id: "outro" } }),
    );
    expect((await chamar("ok")).status).toBe(404);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("404 para pedido inexistente ou id inválido", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha: null }));
    expect((await chamar("ok")).status).toBe(404);
    expect((await chamar("ok", "nao-uuid")).status).toBe(404);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("500 em erro do banco (reserva ou leitura)", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha: nova(), erro: "update" }));
    expect((await chamar("ok")).status).toBe(500);
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha: null, erro: "select" }));
    expect((await chamar("ok")).status).toBe(500);
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("já notificado não envia de novo", async () => {
    createAdminClient.mockReturnValue(
      banco({ user: USUARIO, linha: { ...nova(), notificado_em: "2026-11-26T10:00:00Z" } }),
    );
    const r = await chamar("ok");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ jaNotificado: true });
    expect(notificarPedido).not.toHaveBeenCalled();
  });

  it("caminho feliz notifica uma vez e mantém notificado_em", async () => {
    const linha = nova();
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha }));
    const r = await chamar("ok");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ enviado: true });
    expect(notificarPedido).toHaveBeenCalledTimes(1);
    expect(notificarPedido).toHaveBeenCalledWith(PEDIDO);
    expect(linha.notificado_em).not.toBeNull();
  });

  it("chamadas simultâneas enviam uma vez só", async () => {
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha: nova() }));
    const [a, b] = await Promise.all([chamar("ok"), chamar("ok")]);
    const corpos = [await a.json(), await b.json()];
    expect(corpos).toContainEqual({ enviado: true });
    expect(corpos).toContainEqual({ jaNotificado: true });
    expect(notificarPedido).toHaveBeenCalledTimes(1);
  });

  it("notificarPedido retorna false: desfaz a reserva e responde enviado:false", async () => {
    const linha = nova();
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha }));
    notificarPedido.mockResolvedValue(false);
    const r = await chamar("ok");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ enviado: false });
    expect(linha.notificado_em).toBeNull();
  });

  it("notificarPedido lança: desfaz a reserva e responde 502", async () => {
    const linha = nova();
    createAdminClient.mockReturnValue(banco({ user: USUARIO, linha }));
    notificarPedido.mockRejectedValue(new Error("smtp"));
    const r = await chamar("ok");
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ erro: "falha_ao_notificar" });
    expect(linha.notificado_em).toBeNull();
  });
});
