import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const exigirAdmin = vi.fn();
const createAdminClient = vi.fn();
vi.mock("@/lib/auth/exigir-admin", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

import {
  anonimizarLojista,
  atualizarLojista,
  criarLojista,
  definirAtivo,
  gerarNovaSenha,
  listarLojistas,
} from "./lojistas-admin";

const ID = "11111111-1111-4111-8111-111111111111";

describe("autorização das Server Actions de admin", () => {
  beforeEach(() => {
    exigirAdmin.mockReset();
    createAdminClient.mockReset();
    // Quem não é admin de verdade (ex.: app_metadata adulterado sem profiles.is_admin).
    exigirAdmin.mockRejectedValue(new Error("Acesso negado."));
  });

  const chamadas: [string, () => Promise<unknown>][] = [
    ["listarLojistas", () => listarLojistas("x")],
    ["criarLojista", () => criarLojista(new FormData())],
    ["atualizarLojista", () => atualizarLojista(ID, new FormData())],
    ["definirAtivo", () => definirAtivo(ID, false)],
    ["gerarNovaSenha", () => gerarNovaSenha(ID)],
    ["anonimizarLojista", () => anonimizarLojista(ID)],
  ];

  it.each(chamadas)("%s lança e não toca no banco quando não é admin", async (_nome, chamar) => {
    await expect(chamar()).rejects.toThrow("Acesso negado.");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
