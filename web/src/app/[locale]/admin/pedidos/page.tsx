import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Mail, Receipt } from "lucide-react";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { CelulaAdmin, LinhaAdmin, TabelaAdmin, VazioAdmin } from "@/components/admin/TabelaAdmin";
import { VISUAL_STATUS } from "@/components/pedidos/StatusPedido";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
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
      <CabecalhoAdmin titulo="Pedidos" descricao="Acompanhe pagamentos, notas e envios." />

      <form
        method="get"
        className="mb-6 flex flex-col gap-2 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-3 shadow-suave sm:flex-row sm:items-end"
      >
        <div className="text-sm font-medium text-marca-preto sm:w-64">
          <label htmlFor="filtro-status" className="block">Status</label>
          <select
            id="filtro-status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block h-11 w-full rounded-xl border border-marca-cinza-300 bg-marca-branco px-3 text-sm font-normal text-marca-preto outline-none transition-colors focus-visible:border-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none"
          >
            <option value="">Todos</option>
            {TODOS_STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_PEDIDO[s]}
              </option>
            ))}
          </select>
        </div>
        <Botao type="submit">Filtrar</Botao>
      </form>

      {pedidos.length === 0 ? (
        <VazioAdmin icone={Receipt}>Nenhum pedido encontrado.</VazioAdmin>
      ) : (
        <TabelaAdmin
          colunas={[
            "Pedido",
            "Data",
            "Cliente",
            <span key="t" className="block text-right">Total</span>,
            "Status",
            "E-mails",
          ]}
        >
          {pedidos.map((p) => {
            const { tom, icone } = VISUAL_STATUS[p.status];
            return (
              <LinhaAdmin key={p.numero}>
                <CelulaAdmin className="whitespace-nowrap">
                  <Link
                    href={`/${locale}/admin/pedidos/${p.numero}`}
                    className="rounded font-semibold text-marca-preto underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    #{p.numero}
                  </Link>
                </CelulaAdmin>
                <CelulaAdmin rotulo="Data" className="whitespace-nowrap text-marca-cinza-800">
                  {data.format(new Date(p.created_at))}
                </CelulaAdmin>
                <CelulaAdmin rotulo="Cliente" className="text-marca-preto">
                  <span className="break-words">{p.cliente_nome}</span>
                </CelulaAdmin>
                <CelulaAdmin rotulo="Total" alinhar="direita" className="whitespace-nowrap">
                  {formatarMoeda(p.total, "pt-BR")}
                </CelulaAdmin>
                <CelulaAdmin rotulo="Status">
                  <Selo tom={tom} icone={icone}>
                    {STATUS_PEDIDO[p.status]}
                  </Selo>
                </CelulaAdmin>
                <CelulaAdmin rotulo="E-mails">
                  <Selo icone={p.notificado ? Mail : Clock}>{p.notificado ? "Enviados" : "Pendentes"}</Selo>
                </CelulaAdmin>
              </LinhaAdmin>
            );
          })}
        </TabelaAdmin>
      )}
    </div>
  );
}
