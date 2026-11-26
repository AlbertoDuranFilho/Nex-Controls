import { redirect } from "next/navigation";
import FormProduto from "@/components/admin/FormProduto";
import { ehAdmin } from "@/lib/auth/exigir-admin";

export default async function NovoProdutoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-marca-preto">Novo produto</h1>
      <FormProduto locale={locale} />
    </div>
  );
}
