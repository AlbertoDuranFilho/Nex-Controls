"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { lerPlanilha, type ErroPlanilha, type PendenciaArquivo, type ProdutoImportado } from "@/lib/importacao/ler-planilha";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

const MAX_BYTES = 5 * 1024 * 1024;
const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

async function lerArquivo(
  form: FormData,
): Promise<{ ok: true; buffer: ArrayBuffer } | { ok: false; erro: string }> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return erro("Selecione a planilha (.xlsx).");
  if (!arquivo.name.toLowerCase().endsWith(".xlsx")) return erro("O arquivo precisa ser uma planilha .xlsx.");
  if (arquivo.size > MAX_BYTES) return erro("O arquivo tem mais de 5 MB.");
  return { ok: true, buffer: await arquivo.arrayBuffer() };
}

export type PreviaImportacao = {
  novos: string[];
  atualizados: string[];
  erros: ErroPlanilha[];
  pendencias: PendenciaArquivo[];
};

export async function previaImportacao(form: FormData): Promise<ResultadoAdmin<PreviaImportacao>> {
  await exigirAdmin();
  const a = await lerArquivo(form);
  if (!a.ok) return erro(a.erro);

  const { produtos, erros, pendencias } = await lerPlanilha(a.buffer);
  const codigos = produtos.map((p) => p.codigo);
  const existentes = new Set<string>();
  if (codigos.length > 0) {
    const { data, error } = await createAdminClient().from("produtos").select("codigo").in("codigo", codigos);
    if (error) return erro(MSG_GENERICA);
    for (const l of data ?? []) existentes.add(l.codigo);
  }
  return ok({
    novos: codigos.filter((c) => !existentes.has(c)),
    atualizados: codigos.filter((c) => existentes.has(c)),
    erros,
    pendencias,
  });
}

function mensagemBanco(e: { code?: string; message?: string }): string {
  const m = e.message ?? "";
  if (e.code === "23505") return "Já existe um produto com este código ou slug.";
  if (e.code === "23514") return "Algum campo está com valor inválido.";
  if (m.includes("nao_autorizado")) return "Acesso negado.";
  return MSG_GENERICA;
}

export async function confirmarImportacao(
  form: FormData,
): Promise<ResultadoAdmin<{ criados: number; atualizados: number; pendencias: PendenciaArquivo[] }>> {
  await exigirAdmin();
  const a = await lerArquivo(form);
  if (!a.ok) return erro(a.erro);

  // Relê o arquivo: nada da prévia é confiável.
  const { produtos, erros, pendencias } = await lerPlanilha(a.buffer);
  if (erros.length > 0) return erro("A planilha tem erros. Corrija e envie novamente.");
  if (produtos.length === 0) return erro("A planilha não tem produtos.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_importar_produtos", { p: produtos satisfies ProdutoImportado[] });
  if (error) return erro(mensagemBanco(error));

  revalidateTag("catalogo");
  revalidatePath("/[locale]/admin", "layout");
  const r = (data ?? {}) as { criados?: number; atualizados?: number };
  return ok({ criados: r.criados ?? 0, atualizados: r.atualizados ?? 0, pendencias });
}
