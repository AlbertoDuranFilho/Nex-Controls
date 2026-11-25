import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// cache() do React só existe no runtime de servidor; aqui é identidade.
vi.mock("react", () => ({ cache: <T>(f: T) => f }));

const getUsuarioAtual = vi.fn();
const maybeSingle = vi.fn();
vi.mock("@/lib/auth/usuario-atual", () => ({ getUsuarioAtual: () => getUsuarioAtual() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
  }),
}));

import { ehAdmin, exigirAdmin } from "./exigir-admin";

const usuario = (papel: "admin" | "lojista") => ({ id: "u1", email: "a@b.c", papel, nome: "N" });

describe("exigirAdmin", () => {
  beforeEach(() => {
    getUsuarioAtual.mockReset();
    maybeSingle.mockReset();
  });

  it("recusa sem sessão", async () => {
    getUsuarioAtual.mockResolvedValue(null);
    await expect(exigirAdmin()).rejects.toThrow();
  });

  it("recusa papel lojista mesmo com is_admin", async () => {
    getUsuarioAtual.mockResolvedValue(usuario("lojista"));
    maybeSingle.mockResolvedValue({ data: { is_admin: true } });
    await expect(exigirAdmin()).rejects.toThrow();
  });

  it("recusa app_metadata admin quando profiles.is_admin é false", async () => {
    getUsuarioAtual.mockResolvedValue(usuario("admin"));
    maybeSingle.mockResolvedValue({ data: { is_admin: false } });
    await expect(exigirAdmin()).rejects.toThrow();
    expect(await ehAdmin()).toBe(false);
  });

  it("recusa quando não há profile", async () => {
    getUsuarioAtual.mockResolvedValue(usuario("admin"));
    maybeSingle.mockResolvedValue({ data: null });
    await expect(exigirAdmin()).rejects.toThrow();
  });

  it("aceita papel admin com is_admin true", async () => {
    getUsuarioAtual.mockResolvedValue(usuario("admin"));
    maybeSingle.mockResolvedValue({ data: { is_admin: true } });
    await expect(exigirAdmin()).resolves.toEqual({ id: "u1" });
  });
});
