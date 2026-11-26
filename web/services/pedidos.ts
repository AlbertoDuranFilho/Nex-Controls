import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email/enviar";
import { montarEmailCliente, montarEmailNex, type PedidoEmail } from "@/lib/email/pedido";

// Só servidor (não é Server Action): não pode ser chamado do navegador.
// A Task 9 reaproveita para "reenviar e-mails".

/**
 * Envia os e-mails do pedido (cliente e Nex). Se os dois derem certo, marca
 * `notificado_em` e retorna true. Usa a service role (lê contatos do lojista).
 */
export async function notificarPedido(pedidoId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: p, error } = await db
    .from("pedidos")
    .select(
      "*, pedido_itens(produto_codigo, produto_nome, quantidade, preco_unitario), " +
        "lojistas(email, telefone, whatsapp, responsavel_nome), cupons(codigo)",
    )
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !p) return false;

  const pedido = p as unknown as PedidoRow;
  const dados = paraPedidoEmail(pedido);
  const destinoNex = process.env.EMAIL_PEDIDOS_DESTINO ?? "contato@nexcontrols.com";
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const linkPainel = `${site}/pt/admin/pedidos/${pedido.numero}`;

  const cliente = montarEmailCliente(dados);
  const nex = montarEmailNex(dados, linkPainel);
  const [r1, r2] = await Promise.all([
    enviarEmail({ para: dados.cliente.email, ...cliente, responderPara: destinoNex }),
    enviarEmail({ para: destinoNex, ...nex, responderPara: dados.cliente.email }),
  ]);
  if (!r1.ok || !r2.ok) return false;

  const { error: e2 } = await db.rpc("marcar_pedido_notificado", { p_pedido_id: pedidoId });
  return !e2;
}

type PedidoRow = {
  numero: number;
  created_at: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_tipo_pessoa: "PF" | "PJ";
  cliente_inscricao_estadual: string | null;
  entrega_cep: string;
  entrega_logradouro: string;
  entrega_numero: string;
  entrega_complemento: string | null;
  entrega_bairro: string;
  entrega_cidade: string;
  entrega_uf: string;
  subtotal: number;
  desconto_valor: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  total: number;
  observacao: string | null;
  pedido_itens: { produto_codigo: string; produto_nome: string; quantidade: number; preco_unitario: number }[];
  lojistas: { email: string; telefone: string | null; whatsapp: string | null; responsavel_nome: string | null } | null;
  cupons: { codigo: string } | null;
};

function paraPedidoEmail(p: PedidoRow): PedidoEmail {
  return {
    numero: Number(p.numero),
    data: p.created_at,
    cliente: {
      nome: p.cliente_nome,
      documento: p.cliente_documento,
      tipo_pessoa: p.cliente_tipo_pessoa,
      inscricao_estadual: p.cliente_inscricao_estadual,
      email: p.lojistas?.email ?? "",
      telefone: p.lojistas?.telefone ?? null,
      whatsapp: p.lojistas?.whatsapp ?? null,
      responsavel: p.lojistas?.responsavel_nome ?? null,
    },
    entrega: {
      cep: p.entrega_cep,
      logradouro: p.entrega_logradouro,
      numero: p.entrega_numero,
      complemento: p.entrega_complemento,
      bairro: p.entrega_bairro,
      cidade: p.entrega_cidade,
      uf: p.entrega_uf,
    },
    itens: [...p.pedido_itens]
      .sort((a, b) => a.produto_codigo.localeCompare(b.produto_codigo))
      .map((i) => ({
        codigo: i.produto_codigo,
        nome: i.produto_nome,
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
        total_linha: Math.round(Number(i.preco_unitario) * Number(i.quantidade) * 100) / 100,
      })),
    subtotal: Number(p.subtotal),
    desconto_valor: Number(p.desconto_valor),
    desconto_origem: p.desconto_origem,
    cupom_codigo: p.desconto_origem === "cupom" ? (p.cupons?.codigo ?? null) : null,
    total: Number(p.total),
    observacao: p.observacao,
  };
}
