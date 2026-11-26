import Link from "next/link";
import { redirect } from "next/navigation";
import BotaoCupomAtivo from "@/components/admin/BotaoCupomAtivo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarCupons } from "@/services/cupons-admin";
import { listarLojistas } from "@/services/lojistas-admin";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });

export default async function ListaCuponsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const [cupons, lojistas] = await Promise.all([listarCupons(), listarLojistas()]);
  const nomes = new Map(lojistas.map((l) => [l.id, l.nome]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-marca-preto">Cupons</h1>
        <Link
          href={`/${locale}/admin/cupons/novo`}
          className="bg-marca-preto px-4 py-2 text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800"
        >
          Novo cupom
        </Link>
      </div>

      {cupons.length === 0 ? (
        <p className="text-marca-cinza-600">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Código</th>
                <th scope="col" className="px-4 py-3 font-medium">Desconto</th>
                <th scope="col" className="px-4 py-3 font-medium">Validade</th>
                <th scope="col" className="px-4 py-3 font-medium">Usos</th>
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-marca-preto">{c.codigo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.tipo === "percentual" ? `${String(c.valor).replace(".", ",")}%` : brl.format(c.valor)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">
                    {c.valido_de || c.valido_ate
                      ? `${c.valido_de ? data.format(new Date(c.valido_de)) : "…"} a ${c.valido_ate ? data.format(new Date(c.valido_ate)) : "…"}`
                      : "Sem limite"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{`${c.usos} / ${c.max_usos ?? "ilimitado"}`}</td>
                  <td className="px-4 py-3 text-marca-cinza-800">
                    {c.lojista_id ? (nomes.get(c.lojista_id) ?? "Cliente específico") : "Todos"}
                  </td>
                  <td className="px-4 py-3 text-marca-preto">{c.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/${locale}/admin/cupons/${c.id}`}
                      className="mr-4 text-marca-preto underline underline-offset-2"
                    >
                      Editar
                    </Link>
                    <BotaoCupomAtivo id={c.id} ativo={c.ativo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
