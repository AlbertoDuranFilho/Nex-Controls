import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const exigirAdmin = vi.fn();
const createAdminClient = vi.fn();
const createClient = vi.fn();
vi.mock("@/lib/auth/exigir-admin", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { previaImportacao } from "./importacao-admin";

async function planilha(linhas: ExcelJS.CellValue[][]): Promise<FormData> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Produtos").addRows([["codigo *", "nome *", "preco (R$)"], ...linhas]);
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const fd = new FormData();
  fd.set("arquivo", new File([buf], "produtos.xlsx"));
  return fd;
}

// Produtos já cadastrados: A1 com preço, A2 sem preço.
function adminFalso() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.in = async () => ({
    data: [
      { codigo: "A1", produto_precos: { preco: 10 } },
      { codigo: "A2", produto_precos: null },
    ],
    error: null,
  });
  createAdminClient.mockReturnValue({ from: () => b });
}

beforeEach(() => {
  exigirAdmin.mockReset().mockResolvedValue({ id: "a" });
  createAdminClient.mockReset();
  createClient.mockReset();
});

describe("previaImportacao", () => {
  it("avisa quando um produto existente com preço chega sem preço", async () => {
    adminFalso();
    const r = await previaImportacao(await planilha([["A1", "P", ""], ["A2", "Q", ""], ["A3", "R", ""]]));
    expect(r).toMatchObject({
      ok: true,
      dados: { novos: ["A3"], atualizados: ["A1", "A2"], precoRemovido: ["A1"] },
    });
  });

  it("recusa arquivo acima de 4 MB", async () => {
    const fd = new FormData();
    fd.set("arquivo", new File([new Uint8Array(4 * 1024 * 1024 + 1)], "grande.xlsx"));
    expect(await previaImportacao(fd)).toEqual({ ok: false, erro: "O arquivo tem mais de 4 MB." });
  });
});
