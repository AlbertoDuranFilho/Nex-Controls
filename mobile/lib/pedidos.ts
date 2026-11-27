import type { LucideIcon } from "lucide-react-native";
import {
  BadgeCheck,
  Clock,
  FileText,
  PackageCheck,
  TriangleAlert,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react-native";
import { textos } from "@/constants/textos";
import type { Database } from "@/types/database";
import { SITE_URL, supabase } from "./supabase";

// Pedidos do lojista (mesmas consultas de web/services/pedidos-cliente.ts). Além da RLS,
// toda consulta filtra lojista_id = usuário atual: um admin mal configurado não vê pedido de outro.

export type PedidoStatus = Database["public"]["Enums"]["pedido_status"];

export type PedidoResumo = { numero: number; created_at: string; status: PedidoStatus; total: number };

export type EventoPedido = {
  id: string;
  status_de: PedidoStatus | null;
  status_para: PedidoStatus;
  criado_em: string;
};

export type ItemPedido = {
  codigo: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  total_linha: number;
};

export type PedidoDetalhe = PedidoResumo & {
  subtotal: number;
  desconto_valor: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  frete_valor: number;
  observacao: string | null;
  maino_nota_url: string | null;
  nfe_status: string | null;
  entrega: string;
  itens: ItemPedido[];
  eventos: EventoPedido[];
};

// ===== Status: mesmos tons e ícones do site (StatusPedido + Selo do site) =====

export type TomStatus = "neutro" | "ambar" | "azul" | "violeta" | "ciano" | "verde" | "vermelho";

export const VISUAL_STATUS: Record<PedidoStatus, { tom: TomStatus; icone: LucideIcon }> = {
  aguardando_pagamento: { tom: "ambar", icone: Clock },
  pago: { tom: "azul", icone: BadgeCheck },
  faturado: { tom: "violeta", icone: FileText },
  enviado: { tom: "ciano", icone: Truck },
  entregue: { tom: "verde", icone: PackageCheck },
  cancelado: { tom: "vermelho", icone: XCircle },
  erro_pagamento: { tom: "vermelho", icone: TriangleAlert },
  devolvido: { tom: "neutro", icone: Undo2 },
};

// Tailwind 50/800/200 (fundo/texto/borda), como o Selo do site: texto escuro do mesmo matiz.
export const CORES_TOM: Record<TomStatus, { fundo: string; texto: string; borda: string }> = {
  neutro: { fundo: "#F4F4F5", texto: "#3F3F46", borda: "#E4E4E7" },
  ambar: { fundo: "#FFFBEB", texto: "#92400E", borda: "#FDE68A" },
  azul: { fundo: "#EFF6FF", texto: "#1E40AF", borda: "#BFDBFE" },
  violeta: { fundo: "#F5F3FF", texto: "#5B21B6", borda: "#DDD6FE" },
  ciano: { fundo: "#ECFEFF", texto: "#155E75", borda: "#A5F3FC" },
  verde: { fundo: "#ECFDF5", texto: "#065F46", borda: "#A7F3D0" },
  vermelho: { fundo: "#FEF2F2", texto: "#991B1B", borda: "#FECACA" },
};

export function rotuloStatus(status: PedidoStatus | string): string {
  const r = (textos.pedidos.status as Record<string, string>)[status];
  return r ?? status;
}

/** Status desconhecido (enum novo no banco) cai no neutro, sem quebrar a tela. */
export function visualStatus(status: PedidoStatus | string): { tom: TomStatus; icone: LucideIcon } {
  return (VISUAL_STATUS as Record<string, { tom: TomStatus; icone: LucideIcon }>)[status] ?? {
    tom: "neutro",
    icone: Clock,
  };
}

// ===== Nota fiscal =====

/** Link da DANFE só se for https (mesma regra do site ao gravar) e a nota não estiver cancelada. */
export function linkNotaFiscal(p: Pick<PedidoDetalhe, "maino_nota_url" | "nfe_status">): string | null {
  if (p.nfe_status === "CANCELADA") return null;
  const url = p.maino_nota_url?.trim();
  return url && /^https:\/\//i.test(url) ? url : null;
}

// ===== Datas (horário de Recife, como o site) =====

function formatador(opcoes: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: "America/Recife" });
  } catch {
    return new Intl.DateTimeFormat("pt-BR", opcoes);
  }
}

const fmtData = formatador({ day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = formatador({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarData(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmtData.format(d);
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmtDataHora.format(d);
}

// ===== Consultas =====

export async function listarMeusPedidos(usuarioId: string): Promise<PedidoResumo[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("numero, created_at, status, total")
    .eq("lojista_id", usuarioId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Falha ao listar pedidos.");
  return (data ?? []).map((p) => ({ ...p, numero: Number(p.numero), total: Number(p.total) }));
}

/** Número da rota (texto) → inteiro positivo, ou null. */
export function lerNumeroPedido(texto: string | string[] | undefined): number | null {
  if (typeof texto !== "string" || !/^\d{1,15}$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

type LinhaPedido = {
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
  nfe_status: string | null;
  entrega_logradouro: string;
  entrega_numero: string;
  entrega_complemento: string | null;
  entrega_bairro: string;
  entrega_cidade: string;
  entrega_uf: string;
  entrega_cep: string;
  pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[] | null;
};

/** Pedido do próprio lojista pelo número (outro cliente = inexistente → null). */
export async function obterMeuPedido(usuarioId: string, numero: number): Promise<PedidoDetalhe | null> {
  if (!Number.isSafeInteger(numero) || numero < 1) return null;
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, numero, created_at, status, total, subtotal, desconto_valor, desconto_origem, frete_valor, observacao, maino_nota_url, nfe_status, " +
        "entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, entrega_cep, " +
        "pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario)",
    )
    .eq("numero", numero)
    .eq("lojista_id", usuarioId)
    .maybeSingle();
  if (error) throw new Error("Falha ao obter pedido.");
  if (!data) return null;
  const p = data as unknown as LinhaPedido;

  // Colunas explícitas: pedido_eventos não concede admin_id a `authenticated`.
  const { data: ev, error: e2 } = await supabase
    .from("pedido_eventos")
    .select("id, status_de, status_para, criado_em")
    .eq("pedido_id", p.id)
    .order("criado_em", { ascending: true });
  if (e2) throw new Error("Falha ao obter histórico.");

  const itens = [...(p.pedido_itens ?? [])]
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
    nfe_status: p.nfe_status ?? null,
    entrega: `${p.entrega_logradouro}, ${p.entrega_numero}${complemento} — ${p.entrega_bairro}, ${p.entrega_cidade}/${p.entrega_uf} — CEP ${p.entrega_cep}`,
    itens,
    eventos: (ev ?? []) as EventoPedido[],
  };
}

// ===== Aviso por e-mail (rota do site) =====

export type ResultadoNotificar = "enviado" | "nao_enviado" | "ja_notificado" | "falhou";

/**
 * POST {SITE}/api/app/pedidos/{id}/notificar com o token do usuário: o site confere que o
 * pedido é dele e ainda não foi avisado e manda os mesmos e-mails do pedido feito no site.
 * Nunca lança: o pedido já existe; se falhar, o admin reenvia os e-mails pela tela do pedido.
 */
export async function notificarPedido(id: string): Promise<ResultadoNotificar> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      console.warn("[pedido] aviso por e-mail não enviado: sem sessão");
      return "falhou";
    }
    const res = await fetch(`${SITE_URL}/api/app/pedidos/${encodeURIComponent(id)}/notificar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn("[pedido] aviso por e-mail falhou", res.status);
      return "falhou";
    }
    const corpo = (await res.json().catch(() => null)) as { enviado?: boolean; jaNotificado?: boolean } | null;
    if (corpo?.jaNotificado) return "ja_notificado";
    if (corpo?.enviado) return "enviado";
    console.warn("[pedido] e-mails do pedido não enviados");
    return "nao_enviado";
  } catch (e) {
    console.warn("[pedido] falha ao avisar o pedido", e);
    return "falhou";
  }
}

/** Dispara o aviso sem esperar (não segura a tela de sucesso nem mostra erro ao cliente). */
export function notificarPedidoEmSegundoPlano(id: string): void {
  void notificarPedido(id);
}
