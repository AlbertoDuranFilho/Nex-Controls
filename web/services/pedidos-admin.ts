"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { UUID, texto } from "@/lib/admin/formulario";
import { ehStatus, type PedidoStatus } from "@/lib/pedidos/transicoes";
import { notificarPedido } from "@/services/pedidos";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

// Admin lê pedidos/eventos/profiles com a service role (depois de exigirAdmin):
// pedido_eventos não concede admin_id nem ao `authenticated` admin.

export type PedidoAdminResumo = {
  numero: number;
  created_at: string;
  cliente_nome: string;
  total: number;
  status: PedidoStatus;
  notificado: boolean;
};

export type PedidoAdminDetalhe = {
  id: string;
  numero: number;
  created_at: string;
  status: PedidoStatus;
  cliente_nome: string;
  cliente_documento: string;
  cliente_tipo_pessoa: "PF" | "PJ";
  cliente_inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  entrega: string;
  subtotal: number;
  desconto_valor: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  cupom_codigo: string | null;
  frete_valor: number;
  total: number;
  observacao: string | null;
  notificado: boolean;
  maino_nota_id: string | null;
  maino_nota_url: string | null;
  maino_pedido_id: string | null;
  nfe_status: string | null;
  nfe_erro: string | null;
  itens: { codigo: string; nome: string; quantidade: number; preco_unitario: number; total_linha: number }[];
  eventos: { id: string; status_de: PedidoStatus | null; status_para: PedidoStatus; criado_em: string; admin_nome: string | null; sistema: boolean }[];
};

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

export async function listarPedidosAdmin(status?: PedidoStatus): Promise<PedidoAdminResumo[]> {
  await exigirAdmin();
  let q = createAdminClient()
    .from("pedidos")
    .select("numero, created_at, cliente_nome, total, status, notificado_em")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status && ehStatus(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error("Falha ao listar pedidos.");
  return (data ?? []).map((p) => ({
    numero: Number(p.numero),
    created_at: p.created_at,
    cliente_nome: p.cliente_nome,
    total: Number(p.total),
    status: p.status,
    notificado: p.notificado_em !== null,
  }));
}

export async function obterPedidoAdmin(numero: number): Promise<PedidoAdminDetalhe | null> {
  await exigirAdmin();
  if (!Number.isSafeInteger(numero) || numero < 1) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from("pedidos")
    .select(
      "id, numero, created_at, status, cliente_nome, cliente_documento, cliente_tipo_pessoa, cliente_inscricao_estadual, " +
        "entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, " +
        "subtotal, desconto_valor, desconto_origem, frete_valor, total, observacao, notificado_em, maino_nota_id, maino_nota_url, maino_pedido_id, nfe_status, nfe_erro, " +
        "pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario), " +
        "lojistas(email, telefone), cupons(codigo)",
    )
    .eq("numero", numero)
    .maybeSingle();
  if (error) throw new Error("Falha ao obter pedido.");
  if (!data) return null;
  const p = data as unknown as Record<string, unknown> & {
    id: string;
    pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[];
    lojistas: { email: string; telefone: string | null } | null;
    cupons: { codigo: string } | null;
  };
  const s = (k: string) => p[k] as string;
  const n = (k: string) => Number(p[k]);

  const { data: ev, error: e2 } = await db
    .from("pedido_eventos")
    .select("id, status_de, status_para, criado_em, admin_id")
    .eq("pedido_id", p.id)
    .order("criado_em", { ascending: true });
  if (e2) throw new Error("Falha ao obter histórico.");
  const adminIds = [...new Set((ev ?? []).map((e) => e.admin_id).filter((x): x is string => !!x))];
  const nomes = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: perfis } = await db.from("profiles").select("id, nome").in("id", adminIds);
    for (const pf of perfis ?? []) if (pf.nome) nomes.set(pf.id, pf.nome);
  }

  const complemento = p.entrega_complemento ? `, ${s("entrega_complemento")}` : "";
  return {
    id: p.id,
    numero: n("numero"),
    created_at: s("created_at"),
    status: p.status as PedidoStatus,
    cliente_nome: s("cliente_nome"),
    cliente_documento: s("cliente_documento"),
    cliente_tipo_pessoa: p.cliente_tipo_pessoa as "PF" | "PJ",
    cliente_inscricao_estadual: (p.cliente_inscricao_estadual as string | null) ?? null,
    email: p.lojistas?.email ?? null,
    telefone: p.lojistas?.telefone ?? null,
    entrega: `${s("entrega_logradouro")}, ${s("entrega_numero")}${complemento} — ${s("entrega_bairro")}, ${s("entrega_cidade")}/${s("entrega_uf")} — CEP ${s("entrega_cep")}`,
    subtotal: n("subtotal"),
    desconto_valor: n("desconto_valor"),
    desconto_origem: p.desconto_origem as "nenhum" | "cliente" | "cupom",
    cupom_codigo: p.cupons?.codigo ?? null,
    frete_valor: n("frete_valor"),
    total: n("total"),
    observacao: (p.observacao as string | null) ?? null,
    notificado: p.notificado_em !== null && p.notificado_em !== undefined,
    maino_nota_id: (p.maino_nota_id as string | null) ?? null,
    maino_nota_url: (p.maino_nota_url as string | null) ?? null,
    maino_pedido_id: (p.maino_pedido_id as string | null) ?? null,
    nfe_status: (p.nfe_status as string | null) ?? null,
    nfe_erro: (p.nfe_erro as string | null) ?? null,
    itens: [...p.pedido_itens]
      .sort((a, b) => a.produto_codigo.localeCompare(b.produto_codigo))
      .map((i) => ({
        codigo: i.produto_codigo,
        nome: i.produto_nome,
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
        total_linha: Math.round(Number(i.preco_unitario) * Number(i.quantidade) * 100) / 100,
      })),
    eventos: (ev ?? []).map((e) => ({
      id: e.id,
      status_de: e.status_de,
      status_para: e.status_para,
      criado_em: e.criado_em,
      admin_nome: e.admin_id ? (nomes.get(e.admin_id) ?? null) : null,
      // Sem admin_id em pago→faturado: faturamento automático pela NF-e da Mainô.
      // (admin_id também vira null se o admin for apagado; nos demais casos segue "admin".)
      sistema: !e.admin_id && e.status_de === "pago" && e.status_para === "faturado",
    })),
  };
}

function revalidar() {
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/cliente", "layout");
}

// useActionState: campos `pedido_id`, `status`, `nota_id`, `nota_url`.
// O banco decide (admin_atualizar_pedido, com o usuário admin: is_admin()).
export async function atualizarPedido(_anterior: ResultadoAdmin | null, form: FormData): Promise<ResultadoAdmin> {
  await exigirAdmin();
  const id = texto(form, "pedido_id");
  if (!UUID.test(id)) return erro("Pedido não encontrado.");
  const status = texto(form, "status");
  if (status && !ehStatus(status)) return erro("Status inválido.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_atualizar_pedido", {
    p_pedido_id: id,
    p_status: status ? (status as PedidoStatus) : undefined,
    p_nota_id: texto(form, "nota_id"),
    p_nota_url: texto(form, "nota_url"),
  });
  if (error) {
    if (error.message.includes("transicao_invalida")) return erro("Mudança de status não permitida.");
    if (error.message.includes("url_invalida")) return erro("O link da nota precisa começar com https://.");
    if (error.message.includes("pedido_nao_encontrado")) return erro("Pedido não encontrado.");
    return erro(MSG_GENERICA);
  }
  revalidar();
  return ok(undefined);
}

export async function reenviarEmails(numero: number): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!Number.isSafeInteger(numero) || numero < 1) return erro("Pedido não encontrado.");
  const { data } = await createAdminClient().from("pedidos").select("id").eq("numero", numero).maybeSingle();
  if (!data) return erro("Pedido não encontrado.");
  const enviado = await notificarPedido(data.id).catch(() => false);
  if (!enviado) return erro("Não foi possível enviar os e-mails.");
  revalidar();
  return ok(undefined);
}
