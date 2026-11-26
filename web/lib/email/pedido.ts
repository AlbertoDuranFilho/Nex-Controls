import { escaparHtml } from "@/lib/email/html";
import { formatarMoeda } from "@/lib/formatar";
import { formatarDocumento } from "@/lib/validacao/documento";

// E-mails do pedido: só em português (Global Constraints).
export type PedidoEmail = {
  numero: number;
  /** ISO 8601 (created_at do pedido). */
  data: string;
  cliente: {
    nome: string;
    documento: string;
    tipo_pessoa: "PF" | "PJ";
    inscricao_estadual: string | null;
    email: string;
    telefone: string | null;
    whatsapp: string | null;
    responsavel: string | null;
  };
  entrega: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
  };
  itens: { codigo: string; nome: string; quantidade: number; preco_unitario: number; total_linha: number }[];
  subtotal: number;
  desconto_valor: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  cupom_codigo: string | null;
  total: number;
  observacao: string | null;
};

type Email = { assunto: string; html: string; texto: string };

const moeda = (v: number) => formatarMoeda(Number(v), "pt-BR");
const e = escaparHtml;

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function formatarCep(cep: string): string {
  const d = cep.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}

function rotuloDesconto(p: PedidoEmail): string | null {
  if (p.desconto_origem === "nenhum" || Number(p.desconto_valor) <= 0) return null;
  return p.desconto_origem === "cupom" && p.cupom_codigo
    ? `Desconto (cupom ${p.cupom_codigo})`
    : "Desconto do cliente";
}

function linhasEndereco(p: PedidoEmail): string[] {
  const n = p.entrega;
  return [
    `${n.logradouro}, ${n.numero}${n.complemento ? ` — ${n.complemento}` : ""}`,
    `${n.bairro} — ${n.cidade}/${n.uf}`,
    `CEP ${formatarCep(n.cep)}`,
  ];
}

// ===== Blocos de texto =====

function itensTexto(p: PedidoEmail): string[] {
  return p.itens.map(
    (i) => `- ${i.quantidade} × ${i.codigo} ${i.nome} — ${moeda(i.preco_unitario)} cada = ${moeda(i.total_linha)}`,
  );
}

function valoresTexto(p: PedidoEmail): string[] {
  const desconto = rotuloDesconto(p);
  return [
    `Subtotal (preço de tabela): ${moeda(p.subtotal)}`,
    ...(desconto ? [`${desconto}: -${moeda(p.desconto_valor)}`] : []),
    "Frete: a combinar",
    `Total: ${moeda(p.total)}`,
  ];
}

// ===== Blocos de HTML (todo texto variável passa por escaparHtml) =====

const estiloTabela = 'style="border-collapse:collapse;width:100%;font-size:14px"';
const estiloCelula = 'style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left"';
const estiloNum = 'style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right"';

function itensHtml(p: PedidoEmail): string {
  const linhas = p.itens
    .map(
      (i) =>
        `<tr><td ${estiloCelula}>${e(i.codigo)}</td><td ${estiloCelula}>${e(i.nome)}</td>` +
        `<td ${estiloNum}>${i.quantidade}</td><td ${estiloNum}>${e(moeda(i.preco_unitario))}</td>` +
        `<td ${estiloNum}>${e(moeda(i.total_linha))}</td></tr>`,
    )
    .join("");
  return (
    `<table ${estiloTabela}><thead><tr><th ${estiloCelula}>Código</th><th ${estiloCelula}>Produto</th>` +
    `<th ${estiloNum}>Qtd.</th><th ${estiloNum}>Preço unit.</th><th ${estiloNum}>Total</th></tr></thead>` +
    `<tbody>${linhas}</tbody></table>`
  );
}

function valoresHtml(p: PedidoEmail): string {
  return valoresTexto(p)
    .map((l, i, todas) => (i === todas.length - 1 ? `<p><strong>${e(l)}</strong></p>` : `<p>${e(l)}</p>`))
    .join("");
}

function observacaoHtml(p: PedidoEmail): string {
  return p.observacao
    ? `<p><strong>Observação:</strong><br>${e(p.observacao).replace(/\r?\n/g, "<br>")}</p>`
    : "";
}

function envolver(conteudo: string): string {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px">' +
    conteudo +
    '<p style="color:#666;font-size:12px;margin-top:24px">Nex Controls</p></div>'
  );
}

// ===== E-mails =====

export function montarEmailCliente(p: PedidoEmail): Email {
  const assunto = `Pedido #${p.numero} recebido — Nex Controls`;
  const intro = "Recebemos seu pedido. A Nex entrará em contato para combinar frete e pagamento.";
  const data = formatarData(p.data);

  const texto = [
    `Olá, ${p.cliente.nome}.`,
    "",
    intro,
    "",
    `Pedido #${p.numero} — ${data}`,
    "",
    "Itens:",
    ...itensTexto(p),
    "",
    ...valoresTexto(p),
    ...(p.observacao ? ["", `Observação: ${p.observacao}`] : []),
    "",
    "Entrega:",
    ...linhasEndereco(p),
  ].join("\n");

  const html = envolver(
    `<p>Olá, ${e(p.cliente.nome)}.</p>` +
      `<p>${e(intro)}</p>` +
      `<h2 style="font-size:18px">Pedido #${p.numero} — ${e(data)}</h2>` +
      itensHtml(p) +
      valoresHtml(p) +
      observacaoHtml(p) +
      `<p><strong>Entrega:</strong><br>${linhasEndereco(p).map(e).join("<br>")}</p>`,
  );

  return { assunto, html, texto };
}

export function montarEmailNex(p: PedidoEmail, linkPainel: string): Email {
  const assunto = `Novo pedido #${p.numero} — ${p.cliente.nome}`;
  const c = p.cliente;
  const dadosCliente: [string, string | null][] = [
    ["Cliente", c.nome],
    [c.tipo_pessoa === "PF" ? "CPF" : "CNPJ", formatarDocumento(c.documento)],
    ["Inscrição estadual", c.inscricao_estadual || "—"],
    ["Responsável", c.responsavel],
    ["E-mail", c.email],
    ["Telefone", c.telefone],
    ["WhatsApp", c.whatsapp],
  ];
  const dados = dadosCliente.filter((d): d is [string, string] => Boolean(d[1]));
  const data = formatarData(p.data);

  const texto = [
    `Novo pedido #${p.numero} — ${data}`,
    "",
    ...dados.map(([k, v]) => `${k}: ${v}`),
    "",
    "Entrega:",
    ...linhasEndereco(p),
    "",
    "Itens:",
    ...itensTexto(p),
    "",
    ...valoresTexto(p),
    ...(p.observacao ? ["", `Observação: ${p.observacao}`] : []),
    "",
    `Ver no painel: ${linkPainel}`,
  ].join("\n");

  const html = envolver(
    `<h2 style="font-size:18px">Novo pedido #${p.numero} — ${e(data)}</h2>` +
      `<p>${dados.map(([k, v]) => `<strong>${e(k)}:</strong> ${e(v)}`).join("<br>")}</p>` +
      `<p><strong>Entrega:</strong><br>${linhasEndereco(p).map(e).join("<br>")}</p>` +
      itensHtml(p) +
      valoresHtml(p) +
      observacaoHtml(p) +
      `<p><a href="${e(linkPainel)}">Ver no painel</a><br>${e(linkPainel)}</p>`,
  );

  return { assunto, html, texto };
}

export function montarEmailNotaEmitida(p: {
  numero: number;
  cliente_nome: string;
  email: string;
  danfe_url: string;
  linkPedido: string;
}): Email {
  const assunto = `Nota fiscal do pedido #${p.numero}`;
  const intro = `A nota fiscal do pedido #${p.numero} foi emitida.`;

  const texto = [
    `Olá, ${p.cliente_nome}.`,
    "",
    intro,
    "",
    `Baixar a nota (DANFE): ${p.danfe_url}`,
    `Ver o pedido: ${p.linkPedido}`,
  ].join("\n");

  const html = envolver(
    `<p>Olá, ${e(p.cliente_nome)}.</p>` +
      `<p>${e(intro)}</p>` +
      `<p><a href="${e(p.danfe_url)}">Baixar a nota (DANFE)</a><br>${e(p.danfe_url)}</p>` +
      `<p><a href="${e(p.linkPedido)}">Ver o pedido</a><br>${e(p.linkPedido)}</p>`,
  );

  return { assunto, html, texto };
}
