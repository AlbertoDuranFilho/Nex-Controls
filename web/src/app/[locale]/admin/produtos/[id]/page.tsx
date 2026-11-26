import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FormProduto from "@/components/admin/FormProduto";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { obterProdutoAdmin } from "@/services/produtos-admin";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditarProdutoPage({ params }: Props) {
  const { locale, id } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const produto = await obterProdutoAdmin(id);
  if (!produto) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/admin/produtos`}
          className="text-sm text-marca-cinza-600 hover:text-marca-preto"
        >
          ← Produtos
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-marca-preto">{produto.nome}</h1>
        {produto.ativo ? (
          <Link
            href={`/${locale}/catalogo/${produto.slug}`}
            className="mt-1 inline-block text-sm text-marca-cinza-600 underline underline-offset-2 hover:text-marca-preto"
          >
            Ver no catálogo
          </Link>
        ) : null}
      </div>
      <FormProduto key={produto.id} produto={produto} locale={locale} />
    </div>
  );
}
