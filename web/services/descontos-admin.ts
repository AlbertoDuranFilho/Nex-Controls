"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID } from "@/lib/admin/formulario";
import { parseDecimal } from "@/lib/admin/produto";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

export type DescontoProduto = {
  produto_id: string;
  codigo: string;
  nome: string;
  desconto_percentual: number;
};

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

function revalidar() {
  revalidatePath("/[locale]/admin", "layout");
}

export async function listarDescontosProduto(lojistaId: string): Promise<DescontoProduto[]> {
  await exigirAdmin();
  if (!UUID.test(lojistaId)) return [];
  const { data, error } = await createAdminClient()
    .from("lojista_descontos_produto")
    .select("produto_id, desconto_percentual, produtos(codigo, nome)")
    .eq("lojista_id", lojistaId);
  if (error) throw new Error("Falha ao listar descontos.");
  const linhas = data as unknown as {
    produto_id: string;
    desconto_percentual: number | string;
    produtos: { codigo: string; nome: string } | { codigo: string; nome: string }[] | null;
  }[];
  return linhas
    .map((l) => {
      const p = Array.isArray(l.produtos) ? l.produtos[0] : l.produtos;
      return {
        produto_id: l.produto_id,
        codigo: p?.codigo ?? "",
        nome: p?.nome ?? "",
        desconto_percentual: Number(l.desconto_percentual),
      };
    })
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export async function definirDescontoProduto(
  lojistaId: string,
  produtoId: string,
  percentual: string,
): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(lojistaId)) return erro("Cliente não encontrado.");
  if (!UUID.test(produtoId)) return erro("Selecione um produto.");
  const pct = parseDecimal(percentual);
  if (pct === null || Number.isNaN(pct) || pct > 100 || Math.round(pct * 100) / 100 !== pct) {
    return erro("Desconto deve ser um número entre 0 e 100.");
  }
  const { error } = await createAdminClient()
    .from("lojista_descontos_produto")
    .upsert(
      { lojista_id: lojistaId, produto_id: produtoId, desconto_percentual: pct },
      { onConflict: "lojista_id,produto_id" },
    );
  if (error) return erro(error.code === "23503" ? "Cliente ou produto não encontrado." : MSG_GENERICA);
  revalidar();
  return ok(undefined);
}

export async function removerDescontoProduto(lojistaId: string, produtoId: string): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(lojistaId) || !UUID.test(produtoId)) return erro("Desconto não encontrado.");
  const { error } = await createAdminClient()
    .from("lojista_descontos_produto")
    .delete()
    .eq("lojista_id", lojistaId)
    .eq("produto_id", produtoId);
  if (error) return erro(MSG_GENERICA);
  revalidar();
  return ok(undefined);
}
