import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

// Cliente do usuário (RLS): o lojista só enxerga os próprios pedidos.
// Colunas explícitas: pedido_eventos não concede admin_id a `authenticated`.

export type PedidoResumo = { numero: number; created_at: string; status: PedidoStatus; total: number };

export type PedidoDetalhe = PedidoResumo & {
  subtotal: number;
  desconto_valor: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  frete_valor: number;
  observacao: string | null;
  maino_nota_url: string | null;
  entrega: string;
  itens: { codigo: string; nome: string; quantidade: number; preco_unitario: number; total_linha: number }[];
  eventos: { id: string; status_de: PedidoStatus | null; status_para: PedidoStatus; criado_em: string }[];
};

export async function listarMeusPedidos(): Promise<PedidoResumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("numero, created_at, status, total")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Falha ao listar pedidos.");
  return (data ?? []).map((p) => ({ ...p, numero: Number(p.numero), total: Number(p.total) }));
}

export async function obterMeuPedido(numero: number): Promise<PedidoDetalhe | null> {
  if (!Number.isSafeInteger(numero) || numero < 1) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, numero, created_at, status, total, subtotal, desconto_valor, desconto_origem, frete_valor, observacao, maino_nota_url, " +
        "entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, entrega_cep, " +
        "pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario)",
    )
    .eq("numero", numero)
    .eq("lojista_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error("Falha ao obter pedido.");
  if (!data) return null;
  const p = data as unknown as {
    id: string;
    numero: number;
    created_at: string;
    status: PedidoStatus;
    total: number;
    subtotal: number;
    desconto_valor: number;
    desconto_origem: "nenhum" | "cliente" | "cupom";
    frete_valor: number;
    observacao: string | null;
    maino_nota_url: string | null;
    entrega_logradouro: string;
    entrega_numero: string;
    entrega_complemento: string | null;
    entrega_bairro: string;
    entrega_cidade: string;
    entrega_uf: string;
    entrega_cep: string;
    pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[];
  };

  const { data: ev, error: e2 } = await supabase
    .from("pedido_eventos")
    .select("id, status_de, status_para, criado_em")
    .eq("pedido_id", p.id)
    .order("criado_em", { ascending: true });
  if (e2) throw new Error("Falha ao obter histórico.");

  const itens = [...p.pedido_itens]
    .sort((a, b) => a.produto_codigo.localeCompare(b.produto_codigo))
    .map((i) => ({
      codigo: i.produto_codigo,
      nome: i.produto_nome,
      quantidade: Number(i.quantidade),
      preco_unitario: Number(i.preco_unitario),
      total_linha: Math.round(Number(i.preco_unitario) * Number(i.quantidade) * 100) / 100,
    }));
  const complemento = p.entrega_complemento ? `, ${p.entrega_complemento}` : "";
  return {
    numero: Number(p.numero),
    created_at: p.created_at,
    status: p.status,
    total: Number(p.total),
    subtotal: Number(p.subtotal),
    desconto_valor: Number(p.desconto_valor),
    desconto_origem: p.desconto_origem,
    frete_valor: Number(p.frete_valor),
    observacao: p.observacao,
    maino_nota_url: p.maino_nota_url,
    entrega: `${p.entrega_logradouro}, ${p.entrega_numero}${complemento} — ${p.entrega_bairro}, ${p.entrega_cidade}/${p.entrega_uf} — CEP ${p.entrega_cep}`,
    itens,
    eventos: ev ?? [],
  };
}
