import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...a: unknown[]) => revalidateTag(...a),
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));

const exigirAdmin = vi.fn();
const createAdminClient = vi.fn();
const createClient = vi.fn();
vi.mock("@/lib/auth/exigir-admin", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { assinarUpload, listarProdutosAdmin, salvarProduto } from "./produtos-admin";

function form(campos: Record<string, string>) {
  const f = new FormData();
  f.set("codigo", "P1");
  f.set("nome", "Produto");
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

function rpcFalso(resposta: { data?: unknown; error?: unknown } = {}) {
  const rpc = vi.fn(async () => ({ data: { criados: 1, atualizados: 0 }, error: null, ...resposta }));
  createClient.mockResolvedValue({ rpc });
  return rpc;
}

// Admin client que devolve o id do produto salvo (busca por código).
// A primeira busca (duplicidade) não acha nada; a segunda (id gravado) acha.
function adminFalso(id = "11111111-1111-4111-8111-111111111111") {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) b[m] = () => b;
  const respostas = [null, { id }];
  b.maybeSingle = async () => ({ data: respostas.shift() ?? null, error: null });
  createAdminClient.mockReturnValue({ from: () => b });
}

beforeEach(() => {
  exigirAdmin.mockReset().mockResolvedValue({ id: "a" });
  createAdminClient.mockReset();
  createClient.mockReset();
  revalidateTag.mockReset();
  revalidatePath.mockReset();
});

describe("sem admin", () => {
  it("lança e não grava nada", async () => {
    exigirAdmin.mockRejectedValue(new Error("Acesso negado."));
    await expect(salvarProduto(null, form({}))).rejects.toThrow("Acesso negado.");
    await expect(listarProdutosAdmin()).rejects.toThrow("Acesso negado.");
    await expect(assinarUpload("image")).rejects.toThrow("Acesso negado.");
    expect(createClient).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe("salvarProduto", () => {
  it("recusa NCM com 7 dígitos sem chamar a RPC", async () => {
    const rpc = rpcFalso();
    const r = await salvarProduto(null, form({ ncm: "8537109" }));
    expect(r).toEqual({ ok: false, erro: "NCM inválido: informe 8 dígitos." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("aceita preço com vírgula e envia o item completo", async () => {
    const rpc = rpcFalso();
    adminFalso();
    const r = await salvarProduto(
      null,
      form({
        preco: "189,90",
        ativo: "on",
        especificacoes_json: JSON.stringify([{ nome: "Tensão", valor: "24 V" }]),
      }),
    );
    expect(r.ok).toBe(true);
    const [nome, args] = rpc.mock.calls[0] as unknown as [string, { p: Record<string, unknown>[] }];
    expect(nome).toBe("admin_importar_produtos");
    expect(args.p).toHaveLength(1);
    expect(args.p[0]).toMatchObject({
      codigo: "P1",
      preco: 189.9,
      ativo: true,
      especificacoes: [{ nome: "Tensão", valor: "24 V" }],
      imagens: [],
    });
    expect(args.p[0]).not.toHaveProperty("id");
    expect(revalidateTag).toHaveBeenCalledWith("catalogo");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/admin", "layout");
  });

  it("recusa criar com código que já existe (não faz upsert)", async () => {
    const rpc = rpcFalso();
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) b[m] = () => b;
    b.maybeSingle = async () => ({ data: { id: "x" }, error: null });
    createAdminClient.mockReturnValue({ from: () => b });
    expect(await salvarProduto(null, form({}))).toEqual({
      ok: false,
      erro: "Já existe um produto com este código.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("com id, atualiza por id", async () => {
    const rpc = rpcFalso();
    const id = "22222222-2222-4222-8222-222222222222";
    const r = await salvarProduto(null, form({ id }));
    expect(r).toEqual({ ok: true, dados: { id } });
    const [, args] = rpc.mock.calls[0] as unknown as [string, { p: { id: string }[] }];
    expect(args.p[0].id).toBe(id);
  });

  it("traduz slug duplicado e check de EAN do banco", async () => {
    adminFalso();
    rpcFalso({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"produtos_slug_key\"" } });
    expect(await salvarProduto(null, form({}))).toEqual({
      ok: false,
      erro: "Já existe um produto com este slug.",
    });
    adminFalso();
    rpcFalso({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"produtos_codigo_key\"" } });
    expect(await salvarProduto(null, form({}))).toEqual({
      ok: false,
      erro: "Já existe um produto com este código.",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("assinarUpload", () => {
  it("devolve erro quando o Cloudinary não está configurado", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const r = await assinarUpload("image");
    expect(r.ok).toBe(false);
    vi.unstubAllEnvs();
  });

  it("assina com pasta e limite por tipo", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "nex");
    vi.stubEnv("CLOUDINARY_API_KEY", "k");
    vi.stubEnv("CLOUDINARY_API_SECRET", "s");
    const img = await assinarUpload("image");
    const raw = await assinarUpload("raw");
    vi.unstubAllEnvs();
    expect(img).toMatchObject({ ok: true, dados: { folder: "nex/produtos", resourceType: "image", maxBytes: 5 * 1024 * 1024 } });
    expect(raw).toMatchObject({ ok: true, dados: { folder: "nex/manuais", resourceType: "raw", maxBytes: 20 * 1024 * 1024 } });
  });
});
