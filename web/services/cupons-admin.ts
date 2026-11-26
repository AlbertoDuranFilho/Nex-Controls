"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID, texto } from "@/lib/admin/formulario";
import { validarCupom } from "@/lib/admin/cupom";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

export type CupomAdmin = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  valor_minimo_pedido: number | null;
  valido_de: string | null;
  valido_ate: string | null;
  max_usos: number | null;
  lojista_id: string | null;
  ativo: boolean;
  usos: number;
};

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";
const MSG_DUPLICADO = "Já existe um cupom com este código.";

type LinhaCupom = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number | string;
  valor_minimo_pedido: number | string | null;
  valido_de: string | null;
  valido_ate: string | null;
  max_usos: number | null;
  lojista_id: string | null;
  ativo: boolean;
};

const COLUNAS = "id, codigo, tipo, valor, valor_minimo_pedido, valido_de, valido_ate, max_usos, lojista_id, ativo";

function revalidar() {
  revalidatePath("/[locale]/admin", "layout");
}

async function contarUsos(ids: string[]): Promise<Map<string, number>> {
  const usos = new Map<string, number>();
  if (ids.length === 0) return usos;
  const { data, error } = await createAdminClient()
    .from("pedidos")
    .select("cupom_id")
    .in("cupom_id", ids)
    .neq("status", "cancelado");
  if (error) throw new Error("Falha ao contar usos dos cupons.");
  for (const p of data) if (p.cupom_id) usos.set(p.cupom_id, (usos.get(p.cupom_id) ?? 0) + 1);
  return usos;
}

function montar(l: LinhaCupom, usos: Map<string, number>): CupomAdmin {
  return {
    id: l.id,
    codigo: l.codigo,
    tipo: l.tipo,
    valor: Number(l.valor),
    valor_minimo_pedido: l.valor_minimo_pedido === null ? null : Number(l.valor_minimo_pedido),
    valido_de: l.valido_de,
    valido_ate: l.valido_ate,
    max_usos: l.max_usos,
    lojista_id: l.lojista_id,
    ativo: l.ativo,
    usos: usos.get(l.id) ?? 0,
  };
}

export async function listarCupons(): Promise<CupomAdmin[]> {
  await exigirAdmin();
  const { data, error } = await createAdminClient()
    .from("cupons")
    .select(COLUNAS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Falha ao listar cupons.");
  const linhas = data as unknown as LinhaCupom[];
  const usos = await contarUsos(linhas.map((l) => l.id));
  return linhas.map((l) => montar(l, usos));
}

export async function obterCupom(id: string): Promise<CupomAdmin | null> {
  await exigirAdmin();
  if (!UUID.test(id)) return null;
  const { data, error } = await createAdminClient().from("cupons").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw new Error("Falha ao obter cupom.");
  if (!data) return null;
  const linha = data as unknown as LinhaCupom;
  return montar(linha, await contarUsos([linha.id]));
}

// useActionState: `id` vazio cria; preenchido atualiza.
export async function salvarCupom(
  _anterior: ResultadoAdmin<{ id: string }> | null,
  form: FormData,
): Promise<ResultadoAdmin<{ id: string }>> {
  await exigirAdmin();

  const id = texto(form, "id");
  if (id && !UUID.test(id)) return erro("Cupom não encontrado.");

  const v = validarCupom(form);
  if (!v.ok) return erro(v.erro);

  const db = createAdminClient();
  if (id) {
    const { data, error } = await db.from("cupons").update(v.dados).eq("id", id).select("id");
    if (error) return erro(error.code === "23505" ? MSG_DUPLICADO : MSG_GENERICA);
    if (!data || data.length === 0) return erro("Cupom não encontrado.");
    revalidar();
    return ok({ id });
  }

  const { data, error } = await db.from("cupons").insert(v.dados).select("id").single();
  if (error || !data) return erro(error?.code === "23505" ? MSG_DUPLICADO : MSG_GENERICA);
  revalidar();
  return ok({ id: data.id });
}

// Cupom nunca é apagado: o histórico de pedidos depende dele.
export async function definirCupomAtivo(id: string, ativo: boolean): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(id)) return erro("Cupom não encontrado.");
  const { data, error } = await createAdminClient().from("cupons").update({ ativo }).eq("id", id).select("id");
  if (error) return erro(MSG_GENERICA);
  if (!data || data.length === 0) return erro("Cupom não encontrado.");
  revalidar();
  return ok(undefined);
}
