import Link from "next/link";
import { redirect } from "next/navigation";
import ImportarPlanilha from "@/components/admin/ImportarPlanilha";
import { ehAdmin } from "@/lib/auth/exigir-admin";

export default async function ImportarProdutosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-marca-preto">Importar planilha de produtos</h1>
        <Link href={`/${locale}/admin/produtos`} className="text-sm text-marca-preto underline underline-offset-2">
          Voltar aos produtos
        </Link>
      </div>
      <ImportarPlanilha />
    </div>
  );
}
