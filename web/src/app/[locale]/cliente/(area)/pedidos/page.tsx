import Link from "next/link";
import { getTranslations } from "next-intl/server";
import StatusPedido from "@/components/pedidos/StatusPedido";
import { formatarMoeda } from "@/lib/formatar";
import { listarMeusPedidos } from "@/services/pedidos-cliente";

type Props = { params: Promise<{ locale: string }> };

export default async function MeusPedidosPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pedidos" });
  const pedidos = await listarMeusPedidos();
  const data = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "America/Recife" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-marca-preto">{t("titulo")}</h1>
      {pedidos.length === 0 ? (
        <div className="space-y-3">
          <p className="text-marca-cinza-600">{t("vazio")}</p>
          <Link href={`/${locale}/catalogo`} className="text-marca-preto underline underline-offset-2">
            {t("irCatalogo")}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t("numero")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("data")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t("colunaStatus")}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.numero} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/${locale}/cliente/pedidos/${p.numero}`}
                      className="font-medium text-marca-preto underline underline-offset-2"
                    >
                      #{p.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">{data.format(new Date(p.created_at))}</td>
                  <td className="px-4 py-3"><StatusPedido status={p.status} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatarMoeda(p.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
