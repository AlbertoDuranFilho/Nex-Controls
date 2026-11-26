import Link from "next/link";
import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { formatarMoeda } from "@/lib/formatar";
import { STATUS_PEDIDO, TODOS_STATUS, ehStatus } from "@/lib/pedidos/transicoes";
import { listarPedidosAdmin } from "@/services/pedidos-admin";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function ListaPedidosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const { status: filtro = "" } = await searchParams;
  const status = ehStatus(filtro) ? filtro : undefined;
  const pedidos = await listarPedidosAdmin(status);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-marca-preto">Pedidos</h1>
        <form method="get" className="flex items-end gap-2">
          <div className="text-sm font-medium text-marca-preto">
            <label htmlFor="filtro-status" className="block">Status</label>
            <select
              id="filtro-status"
              name="status"
              defaultValue={status ?? ""}
              className="mt-1 block border border-marca-cinza-200 bg-marca-branco px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {TODOS_STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_PEDIDO[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-marca-preto px-4 py-2 text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800"
          >
            Filtrar
          </button>
        </form>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-marca-cinza-600">Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Pedido</th>
                <th scope="col" className="px-4 py-3 font-medium">Data</th>
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">E-mails</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.numero} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/${locale}/admin/pedidos/${p.numero}`}
                      className="font-medium text-marca-preto underline underline-offset-2"
                    >
                      #{p.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">{data.format(new Date(p.created_at))}</td>
                  <td className="px-4 py-3 text-marca-preto">{p.cliente_nome}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatarMoeda(p.total, "pt-BR")}</td>
                  <td className="px-4 py-3 text-marca-preto">{STATUS_PEDIDO[p.status]}</td>
                  <td className="px-4 py-3 text-marca-cinza-800">{p.notificado ? "Enviados" : "Pendentes"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
