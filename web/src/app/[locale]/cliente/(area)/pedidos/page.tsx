import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, ChevronRight, LayoutGrid, Package, PackageOpen } from "lucide-react";
import { CabecalhoConta } from "@/components/conta/CartaoConta";
import StatusPedido from "@/components/pedidos/StatusPedido";
import Botao from "@/components/ui/Botao";
import { formatarMoeda } from "@/lib/formatar";
import { listarMeusPedidos } from "@/services/pedidos-cliente";

type Props = { params: Promise<{ locale: string }> };

export default async function MeusPedidosPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pedidos" });
  const pedidos = await listarMeusPedidos();
  const data = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/Recife" });

  return (
    <div className="space-y-6">
      <CabecalhoConta icone={Package} titulo={t("titulo")}>
        {t("subtitulo")}
      </CabecalhoConta>
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-marca-cinza-300 bg-marca-branco px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-marca-cinza-100 text-marca-preto">
            <PackageOpen aria-hidden className="size-7" strokeWidth={1.5} />
          </span>
          <p className="mt-5 text-lg font-semibold text-marca-preto">{t("vazio")}</p>
          <p className="mt-1 max-w-sm text-sm text-marca-cinza-600">{t("vazioDica")}</p>
          <Botao href={`/${locale}/catalogo`} icone={LayoutGrid} className="mt-6 px-6">
            {t("irCatalogo")}
          </Botao>
        </div>
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => (
            <li
              key={p.numero}
              className="group relative flex items-center gap-4 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-marca-cinza-300 hover:shadow-lg has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-marca-preto has-[a:focus-visible]:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
            >
              <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-marca-cinza-100 text-marca-preto sm:grid">
                <Package aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 sm:w-44">
                  <Link
                    href={`/${locale}/cliente/pedidos/${p.numero}`}
                    className="font-semibold text-marca-preto after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
                  >
                    {t("numero")} #{p.numero}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-marca-cinza-600">
                    <CalendarDays aria-hidden className="size-3.5" />
                    {data.format(new Date(p.created_at))}
                  </p>
                </div>
                <div className="sm:flex-1">
                  <StatusPedido status={p.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-marca-cinza-500">{t("total")}</p>
                <p className="text-base font-semibold whitespace-nowrap text-marca-preto tabular-nums">
                  {formatarMoeda(p.total, locale)}
                </p>
              </div>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-marca-cinza-400 transition-transform group-hover:translate-x-0.5 group-hover:text-marca-preto motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
