import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import StatusPedido from "@/components/pedidos/StatusPedido";
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
  const dataHora = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });
  const rotuloDesconto = pedido.desconto_origem === "cupom" ? t("cupom") : t("descontoCliente");

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${locale}/cliente/pedidos`} className="text-sm text-marca-cinza-600 hover:text-marca-preto">
          ← {t("voltar")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-marca-preto">
            {t("numero")} #{pedido.numero}
          </h1>
          <StatusPedido status={pedido.status} testId="status-pedido" />
        </div>
        <p className="mt-1 text-sm text-marca-cinza-600">{dataHora.format(new Date(pedido.created_at))}</p>
      </div>

      {novo === "1" ? (
        <p role="status" className="border border-marca-preto bg-marca-cinza-50 px-4 py-3 text-sm text-marca-preto">
          {t("confirmacao")}
        </p>
      ) : null}

      <section aria-labelledby="itens">
        <h2 id="itens" className="mb-3 text-lg font-semibold text-marca-preto">{t("itens")}</h2>
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t("produto")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("quantidade")}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{t("precoUnitario")}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{t("totalLinha")}</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((i) => (
                <tr key={i.codigo} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3">
                    <span className="block text-marca-preto">{i.nome}</span>
                    <span className="text-xs text-marca-cinza-600">{i.codigo}</span>
                  </td>
                  <td className="px-4 py-3">{i.quantidade}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{moeda(i.preco_unitario)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{moeda(i.total_linha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{moeda(pedido.subtotal)}</dd></div>
          {pedido.desconto_valor > 0 ? (
            <div className="flex justify-between"><dt>{rotuloDesconto}</dt><dd>-{moeda(pedido.desconto_valor)}</dd></div>
          ) : null}
          <div className="flex justify-between">
            <dt>{t("frete")}</dt>
            <dd>{pedido.frete_valor > 0 ? moeda(pedido.frete_valor) : t("freteACombinar")}</dd>
          </div>
          <div className="flex justify-between border-t border-marca-cinza-200 pt-2 text-base font-semibold text-marca-preto">
            <dt>{t("total")}</dt><dd>{moeda(pedido.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="entrega">
        <h2 id="entrega" className="mb-2 text-lg font-semibold text-marca-preto">{t("entrega")}</h2>
        <p className="text-sm text-marca-cinza-800">{pedido.entrega}</p>
        {pedido.observacao ? (
          <p className="mt-3 text-sm text-marca-cinza-800">
            <span className="font-medium">{t("observacao")}:</span> {pedido.observacao}
          </p>
        ) : null}
      </section>

      {pedido.maino_nota_url ? (
        <p>
          <a
            href={pedido.maino_nota_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-marca-preto underline underline-offset-2"
          >
            {t("notaFiscal")}
          </a>
        </p>
      ) : null}

      <section aria-labelledby="historico">
        <h2 id="historico" className="mb-2 text-lg font-semibold text-marca-preto">{t("historico")}</h2>
        {pedido.eventos.length === 0 ? (
          <p className="text-sm text-marca-cinza-600">{t("historicoVazio")}</p>
        ) : (
          <ul className="space-y-1 text-sm text-marca-cinza-800">
            {pedido.eventos.map((e) => (
              <li key={e.id}>
                {dataHora.format(new Date(e.criado_em))} —{" "}
                {t("deAte", { de: e.status_de ? tStatus(e.status_de) : "—", para: tStatus(e.status_para) })}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
