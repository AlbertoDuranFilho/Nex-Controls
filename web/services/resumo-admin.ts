import "server-only";
import { cache } from "react";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

// Números do painel (Início e selo do menu). Só contagens (`head: true`): nenhuma linha trafega.
// Service role depois de exigirAdmin, como o resto do admin.

export type UltimoPedido = {
  numero: number;
  created_at: string;
  cliente_nome: string;
  total: number;
  status: PedidoStatus;
};

export type ResumoAdmin = {
  aguardandoPagamento: number;
  clientes: number;
  produtosAtivos: number;
  cuponsAtivos: number;
  ultimosPedidos: UltimoPedido[];
};

function contagem({ count, error }: { count: number | null; error: unknown }): number {
  if (error) throw new Error("Falha ao montar o resumo do painel.");
  return count ?? 0;
}

// Memoizado por requisição: o layout (selo do menu) e o Início pedem o mesmo número.
export const contarAguardandoPagamento = cache(async (): Promise<number> => {
  await exigirAdmin();
  return contagem(
    await createAdminClient()
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_pagamento"),
  );
});

export async function resumoAdmin(): Promise<ResumoAdmin> {
  await exigirAdmin();
  const db = createAdminClient();
  const [aguardandoPagamento, clientes, produtos, cupons, ultimos] = await Promise.all([
    contarAguardandoPagamento(),
    // Cadastros anonimizados (LGPD) não contam como clientes.
    db.from("lojistas").select("id", { count: "exact", head: true }).is("anonimizado_em", null),
    db.from("produtos").select("id", { count: "exact", head: true }).eq("ativo", true),
    db.from("cupons").select("id", { count: "exact", head: true }).eq("ativo", true),
    db
      .from("pedidos")
      .select("numero, created_at, cliente_nome, total, status")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (ultimos.error) throw new Error("Falha ao montar o resumo do painel.");
  return {
    aguardandoPagamento,
    clientes: contagem(clientes),
    produtosAtivos: contagem(produtos),
    cuponsAtivos: contagem(cupons),
    ultimosPedidos: (ultimos.data ?? []).map((p) => ({
      numero: Number(p.numero),
      created_at: p.created_at,
      cliente_nome: p.cliente_nome,
      total: Number(p.total),
      status: p.status,
    })),
  };
}
