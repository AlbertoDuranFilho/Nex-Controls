import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, Clock, Package, Receipt, TicketPercent, Users, type LucideIcon } from "lucide-react";
import Selo from "@/components/ui/Selo";
import { VISUAL_STATUS } from "@/components/pedidos/StatusPedido";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { getUsuarioAtual } from "@/lib/auth/usuario-atual";
import { formatarMoeda } from "@/lib/formatar";
import { STATUS_PEDIDO } from "@/lib/pedidos/transicoes";
import { resumoAdmin } from "@/services/resumo-admin";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });
const numero = new Intl.NumberFormat("pt-BR");

const foco = "focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none";

type Props = { params: Promise<{ locale: string }> };

function CartaoNumero({
  href,
  rotulo,
  valor,
  icone: Icone,
  destaque = false,
}: {
  href: string;
  rotulo: string;
  valor: number;
  icone: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-4 rounded-2xl border bg-marca-branco p-5 shadow-suave transition duration-200 hover:border-marca-cinza-300 hover:shadow-elevada motion-reduce:transition-none ${foco} ${
        destaque ? "border-marca-preto" : "border-marca-cinza-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden="true"
          className={`grid size-10 place-items-center rounded-xl ${
            destaque ? "bg-marca-preto text-marca-branco" : "bg-marca-cinza-100 text-marca-preto"
          }`}
        >
          <Icone className="size-5" strokeWidth={1.75} />
        </span>
        <ArrowRight
          aria-hidden
          className="size-4 text-marca-cinza-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-marca-preto motion-reduce:transition-none"
        />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-marca-preto tabular-nums">{numero.format(valor)}</p>
        <p className="mt-1 text-sm text-marca-cinza-600">{rotulo}</p>
      </div>
    </Link>
  );
}

export default async function InicioAdminPage({ params }: Props) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const [resumo, usuario] = await Promise.all([resumoAdmin(), getUsuarioAtual()]);
  const base = `/${locale}/admin`;
  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-marca-preto sm:text-3xl">Início</h1>
        <p className="mt-1 text-marca-cinza-600">
          {primeiroNome ? `Olá, ${primeiroNome}. ` : "Olá. "}Um resumo do que está acontecendo na loja.
        </p>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          href={`${base}/pedidos?status=aguardando_pagamento`}
          rotulo="Pedidos aguardando pagamento"
          valor={resumo.aguardandoPagamento}
          icone={Clock}
          destaque={resumo.aguardandoPagamento > 0}
        />
        <CartaoNumero href={`${base}/lojistas`} rotulo="Clientes" valor={resumo.clientes} icone={Users} />
        <CartaoNumero href={`${base}/produtos`} rotulo="Produtos ativos" valor={resumo.produtosAtivos} icone={Package} />
        <CartaoNumero href={`${base}/cupons`} rotulo="Cupons ativos" valor={resumo.cuponsAtivos} icone={TicketPercent} />
      </section>

      <section aria-labelledby="ultimos-pedidos" className="rounded-2xl border border-marca-cinza-200 bg-marca-branco shadow-suave">
        <div className="flex items-center justify-between gap-4 border-b border-marca-cinza-100 px-5 py-4">
          <h2 id="ultimos-pedidos" className="text-base font-semibold text-marca-preto">
            Últimos pedidos
          </h2>
          <Link
            href={`${base}/pedidos`}
            className={`rounded-lg text-sm font-medium text-marca-cinza-600 underline-offset-4 hover:text-marca-preto hover:underline ${foco}`}
          >
            Ver todos
          </Link>
        </div>
        {resumo.ultimosPedidos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-marca-cinza-100 text-marca-cinza-500">
              <Receipt className="size-6" strokeWidth={1.75} />
            </span>
            <p className="text-sm text-marca-cinza-600">Nenhum pedido ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-marca-cinza-100">
            {resumo.ultimosPedidos.map((p) => {
              const { tom, icone } = VISUAL_STATUS[p.status];
              return (
                <li key={p.numero}>
                  <Link
                    href={`${base}/pedidos/${p.numero}`}
                    className={`group flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-marca-cinza-50 motion-reduce:transition-none ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-semibold text-marca-preto">#{p.numero}</span>
                        <span className="text-xs text-marca-cinza-500">{data.format(new Date(p.created_at))}</span>
                      </p>
                      <p className="truncate text-sm text-marca-cinza-700" title={p.cliente_nome}>
                        {p.cliente_nome}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row-reverse sm:items-center sm:gap-4">
                      <span className="text-sm font-medium whitespace-nowrap text-marca-preto tabular-nums">
                        {formatarMoeda(p.total, "pt-BR")}
                      </span>
                      <Selo tom={tom} icone={icone}>
                        {STATUS_PEDIDO[p.status]}
                      </Selo>
                    </div>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-marca-cinza-400 group-hover:text-marca-preto" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
