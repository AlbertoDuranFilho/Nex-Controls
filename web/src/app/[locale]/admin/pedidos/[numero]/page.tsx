import { notFound, redirect } from "next/navigation";
import {
  ClipboardList,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Settings2,
  ShoppingBag,
  StickyNote,
  UserRound,
} from "lucide-react";
import AcoesPedido from "@/components/admin/AcoesPedido";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import PainelNfe from "@/components/admin/PainelNfe";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import CartaoConta from "@/components/conta/CartaoConta";
import LinhaDoTempo from "@/components/pedidos/LinhaDoTempo";
import { VISUAL_STATUS } from "@/components/pedidos/StatusPedido";
import Selo from "@/components/ui/Selo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { formatarMoeda } from "@/lib/formatar";
import { STATUS_PEDIDO } from "@/lib/pedidos/transicoes";
import { mascaraDocumento, mascaraTelefone } from "@/lib/mascaras";
import { flags } from "@/lib/flags";
import { nfePendente, sincronizarSePendente } from "@/services/nfe-sincronizar";
import { obterPedidoAdmin } from "@/services/pedidos-admin";

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });
const moeda = (v: number) => formatarMoeda(v, "pt-BR");

type Props = { params: Promise<{ locale: string; numero: string }> };

export default async function PedidoAdminPage({ params }: Props) {
  const { locale, numero } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  if (!/^\d{1,15}$/.test(numero)) notFound();
  let p = await obterPedidoAdmin(Number(numero));
  if (!p) notFound();

  // Nota ainda em andamento (ou aceita sem DANFE): consulta a Mainô antes de renderizar, no
  // máximo a cada 30 s e com timeout curto. Falha não quebra a página.
  if (flags.nfeAutomatica && p.maino_pedido_id && nfePendente(p)) {
    await sincronizarSePendente(p.id); // não lança e não revalida (render)
    p = (await obterPedidoAdmin(Number(numero))) ?? p;
  }

  const visual = VISUAL_STATUS[p.status];
  // Linha do tempo igual à da área do cliente: criação + cada mudança de status, com quem mudou.
  const linhaDoTempo = [
    {
      id: "criado",
      titulo: "Pedido criado",
      quando: p.created_at,
      quandoTexto: dataHora.format(new Date(p.created_at)),
      icone: ShoppingBag,
    },
    ...p.eventos.map((e) => ({
      id: e.id,
      titulo: STATUS_PEDIDO[e.status_para],
      quando: e.criado_em,
      quandoTexto: dataHora.format(new Date(e.criado_em)),
      icone: VISUAL_STATUS[e.status_para].icone,
      detalhe: `${e.status_de ? STATUS_PEDIDO[e.status_de] : "—"} → ${STATUS_PEDIDO[e.status_para]} por ${
        e.sistema ? "sistema (Mainô)" : (e.admin_nome ?? "admin")
      }`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <VoltarAdmin href={`/${locale}/admin/pedidos`}>Voltar para pedidos</VoltarAdmin>
        <CabecalhoAdmin titulo={`Pedido #${p.numero}`} descricao={dataHora.format(new Date(p.created_at))} className="">
          <Selo tom={visual.tom} icone={visual.icone} data-testid="status-pedido">
            {STATUS_PEDIDO[p.status]}
          </Selo>
        </CabecalhoAdmin>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-3 xl:items-start">
        <div className="space-y-6 xl:col-span-2">
          <CartaoConta titulo="Itens" idTitulo="itens" icone={ClipboardList}>
            <ul className="divide-y divide-marca-cinza-100">
              {p.itens.map((i) => (
                <li key={i.codigo} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-marca-cinza-100 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-marca-cinza-700">
                      {i.codigo}
                    </span>
                    <p className="mt-1.5 text-[15px] leading-snug font-medium break-words text-marca-preto">{i.nome}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-sm sm:justify-end">
                    <p className="text-marca-cinza-600 tabular-nums">
                      <span className="sr-only">Quantidade: </span>
                      {i.quantidade} × {moeda(i.preco_unitario)}
                    </p>
                    <p className="font-semibold whitespace-nowrap text-marca-preto tabular-nums sm:w-28 sm:text-right">
                      <span className="sr-only">Total: </span>
                      {moeda(i.total_linha)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-marca-cinza-200 pt-5 text-sm text-marca-cinza-700 sm:ml-auto sm:max-w-xs">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd className="text-marca-preto tabular-nums">{moeda(p.subtotal)}</dd>
              </div>
              {p.desconto_valor > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt>{p.desconto_origem === "cupom" ? `Cupom ${p.cupom_codigo ?? ""}`.trim() : "Desconto do cliente"}</dt>
                  <dd className="font-medium text-marca-preto tabular-nums">-{moeda(p.desconto_valor)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt>Frete</dt>
                <dd className="text-marca-preto">{p.frete_valor > 0 ? moeda(p.frete_valor) : "a combinar"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-marca-cinza-200 pt-4 text-marca-preto">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-2xl font-bold tracking-tight tabular-nums">{moeda(p.total)}</dd>
              </div>
            </dl>
          </CartaoConta>

          <CartaoConta titulo="Histórico" idTitulo="historico" icone={History}>
            <LinhaDoTempo eventos={linhaDoTempo} testId="historico" />
          </CartaoConta>
        </div>

        <div className="space-y-6">
          <CartaoConta titulo="Cliente" idTitulo="cliente" icone={UserRound}>
            <div className="space-y-2 text-sm text-marca-cinza-800">
              <p className="font-semibold break-words text-marca-preto">{p.cliente_nome}</p>
              <p>
                {p.cliente_tipo_pessoa === "PJ" ? "CNPJ" : "CPF"} {mascaraDocumento(p.cliente_documento)}
                {p.cliente_inscricao_estadual ? ` · IE ${p.cliente_inscricao_estadual}` : ""}
              </p>
              {p.email ? (
                <p className="flex items-center gap-2 break-all">
                  <Mail aria-hidden className="size-4 shrink-0 text-marca-cinza-500" />
                  {p.email}
                </p>
              ) : null}
              {p.telefone ? (
                <p className="flex items-center gap-2">
                  <Phone aria-hidden className="size-4 shrink-0 text-marca-cinza-500" />
                  {mascaraTelefone(p.telefone)}
                </p>
              ) : null}
            </div>
          </CartaoConta>

          <CartaoConta titulo="Entrega" idTitulo="entrega" icone={MapPin}>
            <p className="text-sm leading-relaxed break-words text-marca-cinza-800">{p.entrega}</p>
            {p.observacao ? (
              <div className="mt-4 flex gap-2.5 rounded-xl bg-marca-cinza-50 p-3.5 text-sm text-marca-cinza-800">
                <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0 text-marca-cinza-500" />
                <p className="min-w-0 break-words">
                  <span className="font-medium text-marca-preto">Observação:</span> {p.observacao}
                </p>
              </div>
            ) : null}
          </CartaoConta>

          <CartaoConta titulo="Status e nota fiscal" idTitulo="acoes" icone={Settings2}>
            <AcoesPedido
              pedidoId={p.id}
              numero={p.numero}
              status={p.status}
              notaId={p.maino_nota_id}
              notaUrl={p.maino_nota_url}
              notificado={p.notificado}
            />
          </CartaoConta>

          {flags.nfeAutomatica ? (
            <CartaoConta titulo="Nota fiscal (Mainô)" idTitulo="nfe" icone={FileText}>
              <PainelNfe
                pedidoId={p.id}
                status={p.status}
                mainoPedidoId={p.maino_pedido_id}
                nfeStatus={p.nfe_status}
                nfeErro={p.nfe_erro}
                danfeUrl={p.maino_nota_url}
                chave={p.maino_nota_id}
              />
            </CartaoConta>
          ) : null}
        </div>
      </div>
    </div>
  );
}
