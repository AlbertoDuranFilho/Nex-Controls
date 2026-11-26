import Link from "next/link";
import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarProdutosAdmin } from "@/services/produtos-admin";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ busca?: string | string[] }>;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ListaProdutosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { busca } = await searchParams;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const termo = typeof busca === "string" ? busca : "";
  const produtos = await listarProdutosAdmin(termo);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-marca-preto">Produtos</h1>
        <Link
          href={`/${locale}/admin/produtos/novo`}
          className="bg-marca-preto px-4 py-2 text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800"
        >
          Novo produto
        </Link>
      </div>

      <form method="get" className="mb-6 flex gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar
        </label>
        <input
          id="busca"
          name="busca"
          type="search"
          defaultValue={termo}
          placeholder="Código ou nome"
          className="w-full max-w-md border border-marca-cinza-300 bg-marca-branco px-3 py-2 text-marca-preto outline-none focus:border-marca-preto"
        />
        <button
          type="submit"
          className="border border-marca-preto px-4 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
        >
          Buscar
        </button>
      </form>

      {produtos.length === 0 ? (
        <p className="text-marca-cinza-600">Nenhum produto encontrado.</p>
      ) : (
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Código</th>
                <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                <th scope="col" className="px-4 py-3 font-medium">Preço</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">{p.codigo}</td>
                  <td className="px-4 py-3 text-marca-preto">{p.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">
                    {p.preco === null ? "—" : brl.format(p.preco)}
                  </td>
                  <td className="px-4 py-3 text-marca-preto">{p.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/admin/produtos/${p.id}`}
                      className="text-marca-preto underline underline-offset-2"
                    >
                      Editar
                    </Link>
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
