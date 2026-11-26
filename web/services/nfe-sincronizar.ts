import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flags } from "@/lib/flags";
import { enviarEmail } from "@/lib/email/enviar";
import { montarEmailNotaEmitida } from "@/lib/email/pedido";
import { chamarMaino } from "@/lib/maino/cliente";
import { lerConfigMaino, type ConfigMaino } from "@/lib/maino/config";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";
import type { ResultadoAdmin } from "@/lib/admin/resultado";

// Núcleo da NF-e da Mainô, SEM "use server" e SEM revalidatePath: pode rodar durante o
// render de uma página (revalidatePath lança ali) e não vira Server Action chamável.
// Quem expõe ações (services/nfe-admin.ts) chama o núcleo e depois revalida.

export type SituacaoNfe = {
  maino_pedido_id: string | null;
  nfe_status: string | null;
  nfe_erro: string | null;
  maino_nota_url: string | null;
  status: PedidoStatus;
};

export const STATUS_NFE = ["NAO_TRANSMITIDA", "EM_TRANSMISSAO", "ACEITA", "REJEITADA", "CANCELADA", "DENEGADA"];
export const ERRO_MAX = 500;
export const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

export const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
export const ok = <T>(dados: T) => ({ ok: true as const, dados });

export type PedidoRow = {
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
  desconto_origem: "nenhum" | "cliente" | "cupom";
  desconto_valor: number;
  observacao: string | null;
  nfe_atualizado_em: string | null;
  pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[];
  lojistas: { email: string; telefone: string | null } | null;
};

export type Contexto = { db: ReturnType<typeof createAdminClient>; cfg: ConfigMaino; pedido: PedidoRow };

const COLUNAS =
  "id, numero, status, maino_pedido_id, nfe_status, nfe_erro, maino_nota_url, " +
  "cliente_nome, cliente_documento, cliente_tipo_pessoa, cliente_indicador_ie, cliente_inscricao_estadual, " +
  "entrega_cep, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, " +
  "frete_valor, desconto_origem, desconto_valor, observacao, nfe_atualizado_em, pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario), " +
  "lojistas(email, telefone)";

export async function lerPedido(db: ReturnType<typeof createAdminClient>, id: string): Promise<PedidoRow | null> {
  const { data, error } = await db.from("pedidos").select(COLUNAS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as unknown as PedidoRow;
}

export const situacao = (p: PedidoRow): SituacaoNfe => ({
  maino_pedido_id: p.maino_pedido_id,
  nfe_status: p.nfe_status,
  nfe_erro: p.nfe_erro,
  maino_nota_url: p.maino_nota_url,
  status: p.status,
});

type ArgsRegistro = {
  maino_pedido_id?: string;
  status?: string;
  chave?: string;
  danfe_url?: string;
  erro: string | null;
};

/** Grava via sistema_registrar_nfe; devolve o booleano (ACEITA virou faturado) ou null se falhou. */
export async function registrar(ctx: Contexto, a: ArgsRegistro): Promise<boolean | null> {
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

/** Persiste o erro da Mainô (sem alterar o resto) e o devolve. */
export async function falhar(ctx: Contexto, mensagem: string) {
  const texto = mensagem.slice(0, ERRO_MAX);
  await registrar(ctx, { erro: texto });
  return erro(texto);
}

/** Relê o pedido e devolve a situação atual. */
export async function concluir(ctx: Contexto): Promise<ResultadoAdmin<SituacaoNfe>> {
  const atual = await lerPedido(ctx.db, ctx.pedido.id);
  return ok(situacao(atual ?? ctx.pedido));
}

type NotaMaino = { chave_acesso?: unknown; status?: unknown; danfe_url?: unknown };

const textoOuUndefined = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

/** Consulta a nota na Mainô e grava; envia o e-mail uma única vez (quando o banco diz true). Não revalida. */
export async function sincronizarCore(ctx: Contexto, mainoId: string): Promise<ResultadoAdmin<SituacaoNfe>> {
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
  if (virouFaturado === null) return erro(MSG_GENERICA);

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

/**
 * Para páginas (já protegidas por admin): sincroniza a nota de um pedido em andamento.
 * Não lança e não revalida; sem flag, credenciais ou envio à Mainô simplesmente não faz nada.
 */
export async function sincronizarSePendente(pedidoId: string): Promise<void> {
  try {
    if (!flags.nfeAutomatica) return;
    const cfg = lerConfigMaino();
    if (!cfg) return;
    const db = createAdminClient();
    const pedido = await lerPedido(db, pedidoId);
    if (!pedido?.maino_pedido_id) return;
    if (pedido.nfe_status !== "NAO_TRANSMITIDA" && pedido.nfe_status !== "EM_TRANSMISSAO") return;
    await sincronizarCore({ db, cfg, pedido }, pedido.maino_pedido_id);
  } catch {
    // falha da Mainô ou do banco não quebra a página
  }
}
