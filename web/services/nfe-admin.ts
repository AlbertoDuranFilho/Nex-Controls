"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID } from "@/lib/admin/formulario";
import { flags } from "@/lib/flags";
import { chamarMaino } from "@/lib/maino/cliente";
import { lerConfigMaino } from "@/lib/maino/config";
import { buscarIbgePorCep } from "@/lib/maino/ibge";
import { montarPedidoMaino, type PedidoParaMaino } from "@/lib/maino/montar-pedido";
import {
  concluir,
  erro,
  falhar,
  lerPedido,
  MSG_GENERICA,
  ok,
  registrar,
  sincronizarCore,
  situacao,
  type Contexto,
  type PedidoRow,
  type SituacaoNfe,
} from "@/services/nfe-sincronizar";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

// Ações de NF-e pela Mainô (só admin, só com a flag ligada). Usam a service role
// depois de exigirAdmin; o resultado é aplicado de forma atômica por
// sistema_registrar_nfe (status do pedido + evento incluídos).

async function falharERevalidar(ctx: Contexto, mensagem: string) {
  const r = await falhar(ctx, mensagem);
  revalidar();
  return r;
}

async function concluirERevalidar(ctx: Contexto) {
  const r = await concluir(ctx);
  revalidar();
  return r;
}

function revalidar() {
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/cliente", "layout");
}

/** Porta comum: admin, flag, id, credenciais e leitura do pedido. */
async function preparar(pedidoId: string): Promise<{ ok: true; ctx: Contexto } | ReturnType<typeof erro>> {
  await exigirAdmin();
  if (!flags.nfeAutomatica) return erro("Emissão automática de NF-e desligada.");
  if (!UUID.test(pedidoId)) return erro("Pedido não encontrado.");
  const cfg = lerConfigMaino();
  if (!cfg) return erro("Credenciais da Mainô não configuradas.");
  const db = createAdminClient();
  const pedido = await lerPedido(db, pedidoId);
  if (!pedido) return erro("Pedido não encontrado.");
  return { ok: true, ctx: { db, cfg, pedido } };
}

const exigirPago = (p: PedidoRow) =>
  p.status === "pago" ? null : erro("Só pedidos com status Pago podem seguir para a NF-e.");

function paraMaino(p: PedidoRow): PedidoParaMaino {
  return {
    numero: Number(p.numero),
    cliente_tipo_pessoa: p.cliente_tipo_pessoa,
    cliente_documento: p.cliente_documento,
    cliente_nome: p.cliente_nome,
    cliente_indicador_ie: p.cliente_indicador_ie,
    cliente_inscricao_estadual: p.cliente_inscricao_estadual,
    entrega_cep: p.entrega_cep,
    entrega_logradouro: p.entrega_logradouro,
    entrega_numero: p.entrega_numero,
    entrega_complemento: p.entrega_complemento,
    entrega_bairro: p.entrega_bairro,
    entrega_cidade: p.entrega_cidade,
    entrega_uf: p.entrega_uf,
    frete_valor: Number(p.frete_valor),
    observacao: p.observacao,
    desconto_origem: p.desconto_origem,
    desconto_valor: Number(p.desconto_valor),
    itens: [...p.pedido_itens]
      .sort((a, b) => a.produto_codigo.localeCompare(b.produto_codigo))
      .map((i) => ({
        codigo: i.produto_codigo,
        nome: i.produto_nome,
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
      })),
    email: p.lojistas?.email ?? "",
    telefone: p.lojistas?.telefone ?? null,
  };
}

function lerIdMaino(dados: unknown): string | null {
  const d = (dados ?? {}) as { id?: unknown; pedido?: { id?: unknown } | null };
  const id = d.id ?? d.pedido?.id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  if (typeof id === "string" && id.trim() !== "") return id.trim();
  return null;
}

/** Núcleo sem revalidate + revalidate da action. */
async function sincronizar(ctx: Contexto, mainoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const r = await sincronizarCore(ctx, mainoId);
  revalidar();
  return r;
}

/** 1. Cria o pedido na Mainô em digitação (sem transmitir). Idempotente. */
export async function enviarPedidoMaino(pedidoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const pr = await preparar(pedidoId);
  if (!pr.ok) return pr;
  const { ctx } = pr;
  const { pedido } = ctx;

  if (pedido.maino_pedido_id) return ok(situacao(pedido));
  const recusa = exigirPago(pedido);
  if (recusa) return recusa;

  // CEP sem município na ViaCEP não bloqueia: a Mainô resolve pelo CEP.
  const ibge = await buscarIbgePorCep(pedido.entrega_cep);
  const r = await chamarMaino<unknown>(ctx.cfg, "POST", "/pedidos?transmite=0", montarPedidoMaino(paraMaino(pedido), ctx.cfg, ibge));
  if (!r.ok) return falharERevalidar(ctx, r.erro);

  const id = lerIdMaino(r.dados);
  if (!id) return falharERevalidar(ctx, "A Mainô não devolveu o identificador do pedido.");

  const gravado = await registrar(ctx, { maino_pedido_id: id, erro: null });
  if (gravado === null) {
    revalidar();
    return erro(MSG_GENERICA);
  }
  return concluirERevalidar(ctx);
}

/** 2. Pede a emissão da NF-e e já consulta a situação. */
export async function emitirNfeMaino(pedidoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const pr = await preparar(pedidoId);
  if (!pr.ok) return pr;
  const { ctx } = pr;
  const { pedido } = ctx;

  const recusa = exigirPago(pedido);
  if (recusa) return recusa;
  if (!pedido.maino_pedido_id) return erro("Envie o pedido para a Mainô antes de emitir a NF-e.");
  // Mesma regra do botão "Emitir NF-e": só sem nota ou após rejeição. Nos demais estados
  // (inclusive CANCELADA/DENEGADA) é preciso consultar a situação ou tratar na Mainô.
  if (pedido.nfe_status && pedido.nfe_status !== "REJEITADA") {
    return erro("Este pedido já tem uma NF-e em andamento ou emitida. Atualize a situação em vez de emitir de novo.");
  }

  const r = await chamarMaino<unknown>(
    ctx.cfg,
    "POST",
    `/pedidos/${encodeURIComponent(pedido.maino_pedido_id)}/nota_fiscal`,
  );
  if (!r.ok) return falharERevalidar(ctx, r.erro);
  return sincronizar(ctx, pedido.maino_pedido_id);
}

/** 3. Consulta a situação da NF-e (ACEITA fatura o pedido e avisa o cliente, uma vez). */
export async function sincronizarNfeMaino(pedidoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const pr = await preparar(pedidoId);
  if (!pr.ok) return pr;
  const { ctx } = pr;
  if (!ctx.pedido.maino_pedido_id) return erro("Este pedido ainda não foi enviado para a Mainô.");
  return sincronizar(ctx, ctx.pedido.maino_pedido_id);
}

/** 4. Cancela a NF-e aceita. Não altera o status do pedido. */
export async function cancelarNfeMaino(pedidoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const pr = await preparar(pedidoId);
  if (!pr.ok) return pr;
  const { ctx } = pr;
  const { pedido } = ctx;

  if (!pedido.maino_pedido_id || pedido.nfe_status !== "ACEITA") {
    return erro("Só é possível cancelar uma NF-e aceita.");
  }
  const r = await chamarMaino<unknown>(
    ctx.cfg,
    "DELETE",
    `/pedidos/${encodeURIComponent(pedido.maino_pedido_id)}/nota_fiscal`,
  );
  if (!r.ok) return falharERevalidar(ctx, r.erro);

  const gravado = await registrar(ctx, { status: "CANCELADA", erro: null });
  if (gravado === null) {
    revalidar();
    return erro(MSG_GENERICA);
  }
  return concluirERevalidar(ctx);
}
