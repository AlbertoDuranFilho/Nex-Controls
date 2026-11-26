import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

const exigirAdmin = vi.fn();
const createAdminClient = vi.fn();
vi.mock("@/lib/auth/exigir-admin", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

import { paraDataRecife, validarCupom } from "@/lib/admin/cupom";
import { definirCupomAtivo, listarCupons, obterCupom, salvarCupom } from "./cupons-admin";
import { definirDescontoProduto, listarDescontosProduto, removerDescontoProduto } from "./descontos-admin";

const LOJISTA = "11111111-1111-4111-8111-111111111111";
const PRODUTO = "22222222-2222-4222-8222-222222222222";

function form(campos: Record<string, string>) {
  const f = new FormData();
  f.set("codigo", "NATAL10");
  f.set("tipo", "percentual");
  f.set("valor", "10");
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

function bancoFalso(resposta: { data?: unknown; error?: unknown } = {}) {
  const insert = vi.fn();
  const update = vi.fn();
  const upsert = vi.fn();
  const b: Record<string, unknown> = {};
  const final = async () => ({ data: [{ id: "cupom-1" }], error: null, ...resposta });
  b.insert = (...a: unknown[]) => (insert(...a), b);
  b.update = (...a: unknown[]) => (update(...a), b);
  b.upsert = (...a: unknown[]) => (upsert(...a), final());
  b.select = () => b;
  b.eq = () => b;
  b.single = async () => ({ data: { id: "cupom-1" }, error: null, ...resposta });
  b.then = (r: (v: unknown) => unknown) => final().then(r);
  createAdminClient.mockReturnValue({ from: () => b });
  return { insert, update, upsert };
}

beforeEach(() => {
  exigirAdmin.mockReset().mockResolvedValue({ id: "a" });
  createAdminClient.mockReset();
  revalidatePath.mockReset();
});

describe("sem admin", () => {
  it("lança e não toca no banco", async () => {
    exigirAdmin.mockRejectedValue(new Error("Acesso negado."));
    await expect(salvarCupom(null, form({}))).rejects.toThrow("Acesso negado.");
    await expect(listarCupons()).rejects.toThrow("Acesso negado.");
    await expect(definirCupomAtivo(LOJISTA, false)).rejects.toThrow("Acesso negado.");
    await expect(listarDescontosProduto(LOJISTA)).rejects.toThrow("Acesso negado.");
    await expect(definirDescontoProduto(LOJISTA, PRODUTO, "5")).rejects.toThrow("Acesso negado.");
    await expect(removerDescontoProduto(LOJISTA, PRODUTO)).rejects.toThrow("Acesso negado.");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe("salvarCupom", () => {
  it("grava o código em maiúsculas e trimado", async () => {
    const { insert } = bancoFalso();
    const r = await salvarCupom(null, form({ codigo: " promo10 " }));
    expect(r.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ codigo: "PROMO10", tipo: "percentual", valor: 10 }));
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/admin", "layout");
  });

  it("rejeita código curto ou com caracteres inválidos", async () => {
    bancoFalso();
    const a = await salvarCupom(null, form({ codigo: "a" }));
    expect(a).toEqual({ ok: false, erro: expect.stringContaining("Código") });
    const b = await salvarCupom(null, form({ codigo: "PROMO 10!" }));
    expect(b.ok).toBe(false);
  });

  it("rejeita percentual fora de (0, 100]", async () => {
    bancoFalso();
    expect((await salvarCupom(null, form({ valor: "150" }))).ok).toBe(false);
    expect((await salvarCupom(null, form({ valor: "0" }))).ok).toBe(false);
    expect((await salvarCupom(null, form({ valor: "" }))).ok).toBe(false);
  });

  it("aceita cupom em valor com vírgula", async () => {
    const { insert } = bancoFalso();
    const r = await salvarCupom(null, form({ tipo: "valor", valor: "25,50", valor_minimo_pedido: "100" }));
    expect(r.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ tipo: "valor", valor: 25.5, valor_minimo_pedido: 100 }));
  });

  it("rejeita valido_ate anterior a valido_de", async () => {
    bancoFalso();
    const r = await salvarCupom(null, form({ valido_de: "2026-12-25", valido_ate: "2026-12-24" }));
    expect(r).toEqual({ ok: false, erro: expect.stringContaining("validade") });
  });

  it("valido_ate como data vale até o fim do dia (UTC-3)", async () => {
    const { insert } = bancoFalso();
    await salvarCupom(null, form({ valido_de: "2026-12-25", valido_ate: "2026-12-25" }));
    const dados = insert.mock.calls[0][0] as { valido_de: string; valido_ate: string };
    expect(new Date(dados.valido_de).toISOString()).toBe("2026-12-25T03:00:00.000Z");
    expect(new Date(dados.valido_ate).toISOString()).toBe("2026-12-26T02:59:59.000Z");
  });

  it("max_usos vazio é ilimitado; precisa ser inteiro >= 1", async () => {
    const { insert } = bancoFalso();
    await salvarCupom(null, form({ max_usos: "" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ max_usos: null }));
    expect((await salvarCupom(null, form({ max_usos: "0" }))).ok).toBe(false);
    expect((await salvarCupom(null, form({ max_usos: "1,5" }))).ok).toBe(false);
  });

  it("código duplicado vira mensagem amigável", async () => {
    bancoFalso({ error: { code: "23505", message: "cupons_codigo_key" } });
    const r = await salvarCupom(null, form({}));
    expect(r).toEqual({ ok: false, erro: "Já existe um cupom com este código." });
  });
});

describe("definirDescontoProduto", () => {
  it("aceita vírgula e faz upsert", async () => {
    const { upsert } = bancoFalso();
    const r = await definirDescontoProduto(LOJISTA, PRODUTO, "7,5");
    expect(r.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      { lojista_id: LOJISTA, produto_id: PRODUTO, desconto_percentual: 7.5 },
      { onConflict: "lojista_id,produto_id" },
    );
  });

  it("rejeita acima de 100 e vazio", async () => {
    bancoFalso();
    expect((await definirDescontoProduto(LOJISTA, PRODUTO, "101")).ok).toBe(false);
    expect((await definirDescontoProduto(LOJISTA, PRODUTO, "")).ok).toBe(false);
  });
});

function bancoRastreado() {
  const eqs: [string, unknown][] = [];
  const update = vi.fn();
  const del = vi.fn();
  const b: Record<string, unknown> = {};
  const final = async () => ({ data: [{ id: "x" }], error: null });
  b.update = (...a: unknown[]) => (update(...a), b);
  b.delete = () => (del(), b);
  b.select = () => b;
  b.eq = (c: string, v: unknown) => (eqs.push([c, v]), b);
  b.maybeSingle = async () => ({ data: null, error: null });
  b.then = (r: (v: unknown) => unknown) => final().then(r);
  createAdminClient.mockReturnValue({ from: () => b });
  return { eqs, update, del };
}

describe("escopo das escritas", () => {
  it("removerDescontoProduto apaga filtrando por lojista e produto", async () => {
    const { eqs, del } = bancoRastreado();
    const r = await removerDescontoProduto(LOJISTA, PRODUTO);
    expect(r.ok).toBe(true);
    expect(del).toHaveBeenCalledTimes(1);
    expect(eqs).toEqual([["lojista_id", LOJISTA], ["produto_id", PRODUTO]]);
  });

  it("definirCupomAtivo exige admin e altera só ativo, pelo id", async () => {
    const { eqs, update } = bancoRastreado();
    const id = "33333333-3333-4333-8333-333333333333";
    expect((await definirCupomAtivo(id, false)).ok).toBe(true);
    expect(exigirAdmin).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ ativo: false });
    expect(eqs).toEqual([["id", id]]);
  });

  it("obterCupom exige admin", async () => {
    bancoRastreado();
    await obterCupom("33333333-3333-4333-8333-333333333333");
    expect(exigirAdmin).toHaveBeenCalled();
    exigirAdmin.mockRejectedValue(new Error("Acesso negado."));
    await expect(obterCupom("33333333-3333-4333-8333-333333333333")).rejects.toThrow("Acesso negado.");
  });

  it("ids que não são UUID são rejeitados sem tocar no banco", async () => {
    expect(await definirCupomAtivo("abc", true)).toEqual({ ok: false, erro: "Cupom não encontrado." });
    expect((await salvarCupom(null, form({ id: "abc" }))).ok).toBe(false);
    expect(await obterCupom("abc")).toBeNull();
    expect((await definirDescontoProduto("abc", PRODUTO, "5")).ok).toBe(false);
    expect((await definirDescontoProduto(LOJISTA, "abc", "5")).ok).toBe(false);
    expect((await removerDescontoProduto("abc", PRODUTO)).ok).toBe(false);
    expect((await removerDescontoProduto(LOJISTA, "abc")).ok).toBe(false);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe("datas de validade", () => {
  it("ISO guardado -> valor do formulário -> ISO validado é igual ao original", () => {
    for (const original of ["2026-12-25T03:00:00.000Z", "2026-12-26T02:59:59.000Z"]) {
      const dia = paraDataRecife(original);
      const fim = original.endsWith("59.000Z");
      const v = validarCupom(form({ [fim ? "valido_ate" : "valido_de"]: dia }));
      expect(v.ok && (fim ? v.dados.valido_ate : v.dados.valido_de)).toBe(original);
    }
    expect(paraDataRecife("2026-12-26T02:59:59.000Z")).toBe("2026-12-25");
  });
});
