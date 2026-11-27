import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CircleCheck,
  ClipboardList,
  FileDown,
  FileX,
  History,
  MapPin,
  Package,
  Receipt,
  ShoppingBag,
  StickyNote,
} from "lucide-react";
import CartaoConta from "@/components/conta/CartaoConta";
import LinhaDoTempo from "@/components/pedidos/LinhaDoTempo";
import StatusPedido, { VISUAL_STATUS } from "@/components/pedidos/StatusPedido";
import { formatarMoeda } from "@/lib/formatar";
import { obterMeuPedido } from "@/services/pedidos-cliente";

type Props = {
  params: Promise<{ locale: string; numero: string }>;
  searchParams: Promise<{ novo?: string }>;
};

export default async function PedidoPage({ params, searchParams }: Props) {
  const { locale, numero } = await params;
  const { novo } = await searchParams;
  if (!/^\d{1,15}$/.test(numero)) notFound();
  // RLS + filtro por lojista: pedido de outro cliente é igual a inexistente.
  const pedido = await obterMeuPedido(Number(numero));
  if (!pedido) notFound();

  const t = await getTranslations({ locale, namespace: "pedidos" });
  const tStatus = await getTranslations({ locale, namespace: "pedidos.status" });
  const moeda = (v: number) => formatarMoeda(v, locale);
  const dataHora = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Recife" });
  const rotuloDesconto = pedido.desconto_origem === "cupom" ? t("cupom") : t("descontoCliente");

  // Linha do tempo: criação do pedido + cada mudança de status (mais antiga primeiro).
  const linhaDoTempo = [
    { id: "criado", titulo: t("criado"), quando: pedido.created_at, icone: ShoppingBag, de: null as string | null },
    ...pedido.eventos.map((e) => ({
      id: e.id,
      titulo: tStatus(e.status_para),
      quando: e.criado_em,
      icone: VISUAL_STATUS[e.status_para].icone,
      de: e.status_de ? tStatus(e.status_de) : null,
    })),
  ].map((e) => ({
    id: e.id,
    titulo: e.titulo,
    quando: e.quando,
    quandoTexto: dataHora.format(new Date(e.quando)),
    icone: e.icone,
    detalhe: e.de ? t("deAte", { de: e.de, para: e.titulo }) : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/cliente/pedidos`}
          className="group inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-marca-cinza-600 hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {t("voltar")}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-marca-preto text-marca-branco shadow-suave">
            <Package aria-hidden className="size-5.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-marca-preto sm:text-[28px]">
                {t("numero")} #{pedido.numero}
              </h1>
              <StatusPedido status={pedido.status} testId="status-pedido" />
            </div>
            <p className="mt-0.5 text-sm text-marca-cinza-600">{dataHora.format(new Date(pedido.created_at))}</p>
          </div>
        </div>
      </div>

      {novo === "1" ? (
        <p
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-marca-preto px-5 py-4 text-sm text-marca-branco shadow-suave"
        >
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
          {t("confirmacao")}
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-6">
          <CartaoConta titulo={t("itens")} idTitulo="itens" icone={ClipboardList}>
            <ul className="divide-y divide-marca-cinza-100">
              {pedido.itens.map((i) => (
                <li key={i.codigo} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-marca-cinza-100 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-marca-cinza-700">
                      {i.codigo}
                    </span>
                    <p className="mt-1.5 text-[15px] leading-snug font-medium text-marca-preto">{i.nome}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-sm sm:justify-end">
                    <p className="text-marca-cinza-600 tabular-nums">
                      <span className="sr-only">{t("quantidade")}: </span>
                      {i.quantidade} × {moeda(i.preco_unitario)}
                    </p>
                    <p className="font-semibold whitespace-nowrap text-marca-preto tabular-nums sm:w-28 sm:text-right">
                      <span className="sr-only">{t("totalLinha")}: </span>
                      {moeda(i.total_linha)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CartaoConta>

          <CartaoConta titulo={t("historico")} idTitulo="historico" icone={History}>
            <LinhaDoTempo eventos={linhaDoTempo} />
          </CartaoConta>
        </div>

        <div className="space-y-6 xl:sticky xl:top-28">
          <CartaoConta titulo={t("resumo")} idTitulo="resumo" icone={Receipt}>
            <dl className="space-y-3 text-sm text-marca-cinza-700">
              <div className="flex justify-between gap-4">
                <dt>{t("subtotal")}</dt>
                <dd className="text-marca-preto tabular-nums">{moeda(pedido.subtotal)}</dd>
              </div>
              {pedido.desconto_valor > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt>{rotuloDesconto}</dt>
                  <dd className="font-medium text-marca-preto tabular-nums">−{moeda(pedido.desconto_valor)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt>{t("frete")}</dt>
                <dd className="text-marca-preto">{pedido.frete_valor > 0 ? moeda(pedido.frete_valor) : t("freteACombinar")}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-marca-cinza-200 pt-4 text-marca-preto">
                <dt className="text-base font-semibold">{t("total")}</dt>
                <dd className="text-2xl font-bold tracking-tight tabular-nums">{moeda(pedido.total)}</dd>
              </div>
            </dl>

            {pedido.nfe_status === "CANCELADA" ? (
              <p
                data-testid="nota-cancelada"
                className="mt-5 flex items-center gap-2 rounded-xl bg-marca-cinza-50 px-3.5 py-3 text-sm font-medium text-marca-cinza-800"
              >
                <FileX aria-hidden className="size-4 shrink-0" />
                {t("notaCancelada")}
              </p>
            ) : pedido.maino_nota_url ? (
              <a
                href={pedido.maino_nota_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-marca-cinza-300 bg-marca-branco px-4 text-sm font-semibold text-marca-preto transition duration-200 hover:border-marca-preto hover:bg-marca-cinza-50 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                <FileDown aria-hidden className="size-4" />
                {t("notaFiscal")}
              </a>
            ) : null}
          </CartaoConta>

          <CartaoConta titulo={t("entrega")} idTitulo="entrega" icone={MapPin}>
            <p className="text-sm leading-relaxed text-marca-cinza-800">{pedido.entrega}</p>
            {pedido.observacao ? (
              <div className="mt-4 flex gap-2.5 rounded-xl bg-marca-cinza-50 p-3.5 text-sm text-marca-cinza-800">
                <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0 text-marca-cinza-500" />
                <p className="min-w-0 break-words">
                  <span className="font-medium text-marca-preto">{t("observacao")}:</span> {pedido.observacao}
                </p>
              </div>
            ) : null}
          </CartaoConta>
        </div>
      </div>
    </div>
  );
}
