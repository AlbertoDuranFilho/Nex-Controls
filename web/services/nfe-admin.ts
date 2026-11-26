"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID } from "@/lib/admin/formulario";
import { flags } from "@/lib/flags";
import { enviarEmail } from "@/lib/email/enviar";
import { montarEmailNotaEmitida } from "@/lib/email/pedido";
import { chamarMaino } from "@/lib/maino/cliente";
import { lerConfigMaino, type ConfigMaino } from "@/lib/maino/config";
import { buscarIbgePorCep } from "@/lib/maino/ibge";
import { montarPedidoMaino, type PedidoParaMaino } from "@/lib/maino/montar-pedido";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

import type { ResultadoAdmin } from "@/lib/admin/resultado";

// Ações de NF-e pela Mainô (só admin, só com a flag ligada). Usam a service role
// depois de exigirAdmin; o resultado é aplicado de forma atômica por
// sistema_registrar_nfe (status do pedido + evento incluídos).

export type SituacaoNfe = {
  maino_pedido_id: string | null;
  nfe_status: string | null;
  nfe_erro: string | null;
  maino_nota_url: string | null;
  status: PedidoStatus;
};

const STATUS_NFE = ["NAO_TRANSMITIDA", "EM_TRANSMISSAO", "ACEITA", "REJEITADA", "CANCELADA", "DENEGADA"];
const ERRO_MAX = 500;
const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

type PedidoRow = {
  id: string;
  numero: number;
  status: PedidoStatus;
  maino_pedido_id: string | null;
  nfe_status: string | null;
  nfe_erro: string | null;
  maino_nota_url: string | null;
  cliente_nome: string;
  cliente_documento: string;
  cliente_tipo_pessoa: "PF" | "PJ";
  cliente_indicador_ie: "contribuinte" | "isento" | "nao_contribuinte";
  cliente_inscricao_estadual: string | null;
  entrega_cep: string;
  entrega_logradouro: string;
  entrega_numero: string;
  entrega_complemento: string | null;
  entrega_bairro: string;
  entrega_cidade: string;
  entrega_uf: string;
  frete_valor: number;
  observacao: string | null;
  pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[];
  lojistas: { email: string; telefone: string | null } | null;
};

type Contexto = { db: ReturnType<typeof createAdminClient>; cfg: ConfigMaino; pedido: PedidoRow };

const COLUNAS =
  "id, numero, status, maino_pedido_id, nfe_status, nfe_erro, maino_nota_url, " +
  "cliente_nome, cliente_documento, cliente_tipo_pessoa, cliente_indicador_ie, cliente_inscricao_estadual, " +
  "entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, " +
  "frete_valor, observacao, pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario), " +
  "lojistas(email, telefone)";

async function lerPedido(db: ReturnType<typeof createAdminClient>, id: string): Promise<PedidoRow | null> {
  const { data, error } = await db.from("pedidos").select(COLUNAS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as unknown as PedidoRow;
}

const situacao = (p: PedidoRow): SituacaoNfe => ({
  maino_pedido_id: p.maino_pedido_id,
  nfe_status: p.nfe_status,
  nfe_erro: p.nfe_erro,
  maino_nota_url: p.maino_nota_url,
  status: p.status,
});

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

type ArgsRegistro = {
  maino_pedido_id?: string;
  status?: string;
  chave?: string;
  danfe_url?: string;
  erro: string | null;
};

/** Grava via sistema_registrar_nfe; devolve o booleano (ACEITA virou faturado) ou null se falhou. */
async function registrar(ctx: Contexto, a: ArgsRegistro): Promise<boolean | null> {
  const { data, error } = await ctx.db.rpc("sistema_registrar_nfe", {
    p_pedido_id: ctx.pedido.id,
    p_maino_pedido_id: a.maino_pedido_id,
    p_nfe_status: a.status,
    p_chave: a.chave,
    p_danfe_url: a.danfe_url,
    // null limpa nfe_erro no banco; o tipo gerado só conhece string | undefined.
    p_erro: a.erro as string,
  });
  if (error) return null;
  return data === true;
}

/** Persiste o erro da Mainô (sem alterar o resto) e o devolve ao admin. */
async function falhar(ctx: Contexto, mensagem: string) {
  const texto = mensagem.slice(0, ERRO_MAX);
  await registrar(ctx, { erro: texto });
  revalidar();
  return erro(texto);
}

/** Relê o pedido e devolve a situação atual. */
async function concluir(ctx: Contexto): Promise<ResultadoAdmin<SituacaoNfe>> {
  revalidar();
  const atual = await lerPedido(ctx.db, ctx.pedido.id);
  return ok(situacao(atual ?? ctx.pedido));
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

type NotaMaino = { chave_acesso?: unknown; status?: unknown; danfe_url?: unknown };

const textoOuUndefined = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

/** Consulta a nota na Mainô e grava; envia o e-mail uma única vez (quando o banco diz true). */
async function sincronizar(ctx: Contexto, mainoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
  const r = await chamarMaino<{ nota_fiscal?: NotaMaino | null }>(
    ctx.cfg,
    "GET",
    `/pedidos/${encodeURIComponent(mainoId)}/nota_fiscal`,
  );
  if (!r.ok) return falhar(ctx, r.erro);

  const nota = r.dados?.nota_fiscal;
  const status = textoOuUndefined(nota?.status);
  if (!nota || !status || !STATUS_NFE.includes(status)) {
    return falhar(ctx, "A Mainô devolveu uma situação de nota desconhecida.");
  }
  const danfe = textoOuUndefined(nota.danfe_url);

  const virouFaturado = await registrar(ctx, {
    status,
    chave: textoOuUndefined(nota.chave_acesso),
    danfe_url: danfe,
    erro: null,
  });
  if (virouFaturado === null) {
    revalidar();
    return erro(MSG_GENERICA);
  }

  if (virouFaturado) agendarEmailNota(ctx.pedido, danfe ?? ctx.pedido.maino_nota_url);
  return concluir(ctx);
}

function agendarEmailNota(p: PedidoRow, danfe: string | null) {
  const destino = p.lojistas?.email;
  if (!destino || !danfe) {
    console.error("[nfe] e-mail da nota não enviado (sem e-mail ou DANFE)", p.numero);
    return;
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const email = montarEmailNotaEmitida({
    numero: Number(p.numero),
    cliente_nome: p.cliente_nome,
    email: destino,
    danfe_url: danfe,
    linkPedido: `${site}/pt/cliente/pedidos/${p.numero}`,
  });
  // A nota já está gravada: o e-mail sai depois da resposta e falha só é registrada.
  after(async () => {
    try {
      const r = await enviarEmail({ para: destino, ...email });
      if (!r.ok) console.error("[nfe] e-mail da nota não enviado", p.numero);
    } catch (e) {
      console.error("[nfe] falha ao enviar e-mail da nota", p.numero, e);
    }
  });
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
  if (!r.ok) return falhar(ctx, r.erro);

  const id = lerIdMaino(r.dados);
  if (!id) return falhar(ctx, "A Mainô não devolveu o identificador do pedido.");

  const gravado = await registrar(ctx, { maino_pedido_id: id, erro: null });
  if (gravado === null) {
    revalidar();
    return erro(MSG_GENERICA);
  }
  return concluir(ctx);
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
  if (!r.ok) return falhar(ctx, r.erro);
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
  if (!r.ok) return falhar(ctx, r.erro);

  const gravado = await registrar(ctx, { status: "CANCELADA", erro: null });
  if (gravado === null) {
    revalidar();
    return erro(MSG_GENERICA);
  }
  return concluir(ctx);
}
