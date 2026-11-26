"use server";

import { createClient } from "@/lib/supabase/server";
import { notificarPedido } from "@/services/pedidos";

export type ResultadoAdicionar =
  | { ok: true; quantidade: number }
  | { ok: false; erro: "nao_logado" | "quantidade_invalida" | "indisponivel" };

function quantidadeValida(quantidade: number): boolean {
  return Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 9999;
}

export async function adicionarAoCarrinho(
  produtoId: string,
  quantidade: number,
): Promise<ResultadoAdicionar> {
  if (!quantidadeValida(quantidade)) {
    return { ok: false, erro: "quantidade_invalida" };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "nao_logado" };

  const { data, error } = await supabase.rpc("carrinho_adicionar", {
    p_produto_id: produtoId,
    p_quantidade: quantidade,
  });
  if (error) {
    if (error.message.includes("quantidade_invalida")) {
      return { ok: false, erro: "quantidade_invalida" };
    }
    return { ok: false, erro: "indisponivel" };
  }
  return { ok: true, quantidade: data };
}

// ===== Simulação (formato JSON de simular_pedido) =====

export type ItemSimulacao = {
  produto_id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  preco_tabela: number | null;
  desconto_percentual: number | null;
  preco_unitario: number | null;
  total_linha: number;
  valido: boolean;
  motivo: null | "inativo" | "sem_preco";
};

export type CupomSimulacao = {
  codigo: string | null;
  situacao: "ausente" | "aplicado" | "pior" | "invalido";
  motivo:
    | null
    | "inexistente"
    | "inativo"
    | "fora_validade"
    | "esgotado"
    | "ja_usado"
    | "valor_minimo";
  valor_minimo: number | null;
};

export type Bloqueio = "conta_inativa" | "carrinho_vazio" | "sem_endereco" | "itens_invalidos";

export type Simulacao = {
  itens: ItemSimulacao[];
  subtotal: number;
  desconto_cliente: number;
  desconto_cupom: number;
  desconto_aplicado: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  frete: number;
  icms: number;
  difal: number;
  total: number;
  cupom: CupomSimulacao;
  bloqueios: Bloqueio[];
};

const numOuNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// numeric do Postgres pode chegar como número ou string dentro do jsonb: normaliza.
function normalizar(bruto: Simulacao): Simulacao {
  return {
    ...bruto,
    itens: bruto.itens.map((i) => ({
      ...i,
      quantidade: Number(i.quantidade),
      preco_tabela: numOuNull(i.preco_tabela),
      desconto_percentual: numOuNull(i.desconto_percentual),
      preco_unitario: numOuNull(i.preco_unitario),
      total_linha: Number(i.total_linha),
    })),
    subtotal: Number(bruto.subtotal),
    desconto_cliente: Number(bruto.desconto_cliente),
    desconto_cupom: Number(bruto.desconto_cupom),
    desconto_aplicado: Number(bruto.desconto_aplicado),
    frete: Number(bruto.frete),
    icms: Number(bruto.icms),
    difal: Number(bruto.difal),
    total: Number(bruto.total),
    cupom: { ...bruto.cupom, valor_minimo: numOuNull(bruto.cupom.valor_minimo) },
  };
}

/** Resumo do carrinho do lojista logado (uma chamada a simular_pedido). null sem sessão. */
export async function simularCarrinho(cupom?: string): Promise<Simulacao | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const codigo = cupom?.trim() ? cupom.trim().slice(0, 64) : undefined;
  const { data, error } = await supabase.rpc("simular_pedido", { p_cupom: codigo });
  if (error || !data) return null;
  return normalizar(data as unknown as Simulacao);
}

export async function atualizarQuantidade(
  produtoId: string,
  quantidade: number,
): Promise<{ ok: boolean; erro?: "quantidade_invalida" }> {
  if (!quantidadeValida(quantidade)) return { ok: false, erro: "quantidade_invalida" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  // RLS: só o dono; o WITH CHECK recusa produto inativo.
  const { data, error } = await supabase
    .from("carrinho_itens")
    .update({ quantidade })
    .eq("lojista_id", auth.user.id)
    .eq("produto_id", produtoId)
    .select("produto_id");
  return { ok: !error && (data?.length ?? 0) > 0 };
}

export async function removerItem(produtoId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  const { error } = await supabase
    .from("carrinho_itens")
    .delete()
    .eq("lojista_id", auth.user.id)
    .eq("produto_id", produtoId);
  return { ok: !error };
}

type RespostaCriarPedido =
  | { ok: true; id: string; numero: number }
  | { ok: false; erro: string; motivo?: string };

export async function gerarPedido(
  cupom: string | null,
  observacao: string,
): Promise<{ ok: true; numero: number } | { ok: false; erro: string; motivo?: string }> {
  const obs = observacao.trim();
  if (obs.length > 500) return { ok: false, erro: "observacao_longa" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_pedido", {
    p_cupom: cupom?.trim() ? cupom.trim().slice(0, 64) : undefined,
    p_observacao: obs || undefined,
  });
  if (error || !data) return { ok: false, erro: "erro" };

  const r = data as unknown as RespostaCriarPedido;
  if (!r.ok) return { ok: false, erro: r.erro, ...(r.motivo ? { motivo: r.motivo } : {}) };

  // O pedido já existe: falha no e-mail não muda o resultado (fica sem notificado_em).
  await notificarPedido(r.id).catch((e) => {
    console.error("[pedido] falha ao notificar", r.numero, e);
  });
  return { ok: true, numero: Number(r.numero) };
}
