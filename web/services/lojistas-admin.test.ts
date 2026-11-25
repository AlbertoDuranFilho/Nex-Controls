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

// Cliente falso: cada chamada a from() consome o próximo resultado da fila e registra
// a cadeia de métodos; rpc e auth.admin são espiões.
type Resultado = { data?: unknown; error?: unknown };
function clienteFalso(filas: { from: Resultado[]; rpc?: Resultado; auth?: Resultado }) {
  const ordem: string[] = [];
  const cadeias: { tabela: string; chamadas: [string, unknown[]][] }[] = [];
  const db = {
    from(tabela: string) {
      const r = filas.from.shift() ?? { data: null, error: null };
      const registro = { tabela, chamadas: [] as [string, unknown[]][] };
      cadeias.push(registro);
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "update", "insert", "order", "limit", "or"]) {
        b[m] = (...args: unknown[]) => {
          registro.chamadas.push([m, args]);
          if (m === "update") ordem.push(`update:${tabela}`);
          return b;
        };
      }
      b.maybeSingle = () => Promise.resolve({ data: null, error: null, ...r });
      b.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null, ...r }).then(ok, falha);
      return b;
    },
    rpc: vi.fn(async (nome: string) => {
      ordem.push(`rpc:${nome}`);
      return { data: null, error: null, ...filas.rpc };
    }),
    auth: {
      admin: {
        updateUserById: vi.fn(async () => {
          ordem.push("auth:updateUserById");
          return { data: {}, error: null, ...filas.auth };
        }),
      },
    },
  };
  return { db, ordem, cadeias };
}

function formEdicao() {
  const f = new FormData();
  f.set("nome", "Loja");
  f.set("email", "loja@x.test");
  f.set("desconto_percentual", "0");
  f.set("indicador_ie", "nao_contribuinte");
  return f;
}

describe("atualizarLojista", () => {
  beforeEach(() => {
    exigirAdmin.mockReset().mockResolvedValue(undefined);
    createAdminClient.mockReset();
  });

  it("só grava em cadastro não anonimizado e trata 0 linhas como erro", async () => {
    const { db, cadeias } = clienteFalso({
      from: [
        { data: { nome: "Loja", email: "loja@x.test", anonimizado_em: null } },
        { data: [] }, // anonimizado entre a leitura e o update
      ],
    });
    createAdminClient.mockReturnValue(db);
    const r = await atualizarLojista(ID, formEdicao());
    expect(r).toEqual({ ok: false, erro: "Cliente não encontrado ou já anonimizado." });
    expect(cadeias[1].chamadas).toContainEqual(["is", ["anonimizado_em", null]]);
  });

  it("com 1 linha atualizada retorna ok", async () => {
    const { db } = clienteFalso({
      from: [{ data: { nome: "Loja", email: "loja@x.test", anonimizado_em: null } }, { data: [{ id: ID }] }],
    });
    createAdminClient.mockReturnValue(db);
    expect(await atualizarLojista(ID, formEdicao())).toEqual({ ok: true, dados: undefined });
  });
});

describe("anonimizarLojista", () => {
  beforeEach(() => {
    exigirAdmin.mockReset().mockResolvedValue(undefined);
    createAdminClient.mockReset();
  });

  it("limpa o schema auth via rpc depois do updateUserById e antes de lojistas", async () => {
    const { db, ordem } = clienteFalso({ from: [{ data: { anonimizado_em: null } }, {}] });
    createAdminClient.mockReturnValue(db);
    expect(await anonimizarLojista(ID)).toEqual({ ok: true, dados: undefined });
    expect(db.rpc).toHaveBeenCalledWith("anonimizar_auth", {
      uid: ID,
      email_anonimo: `anonimizado-${ID}@invalid`,
    });
    expect(ordem).toEqual(["auth:updateUserById", "rpc:anonimizar_auth", "update:lojistas"]);
  });

  it("se a rpc falhar, não marca lojistas como anonimizado (admin pode repetir)", async () => {
    const { db, ordem } = clienteFalso({
      from: [{ data: { anonimizado_em: null } }],
      rpc: { error: { message: "falhou" } },
    });
    createAdminClient.mockReturnValue(db);
    const r = await anonimizarLojista(ID);
    expect(r.ok).toBe(false);
    expect(ordem).not.toContain("update:lojistas");
  });
});
