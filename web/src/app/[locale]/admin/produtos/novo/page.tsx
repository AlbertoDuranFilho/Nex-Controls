import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import FormProduto from "@/components/admin/FormProduto";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import { ehAdmin } from "@/lib/auth/exigir-admin";

export default async function NovoProdutoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  return (
    <div>
      <VoltarAdmin href={`/${locale}/admin/produtos`}>Voltar para produtos</VoltarAdmin>
      <CabecalhoAdmin titulo="Novo produto" descricao="Depois de salvar, você continua na edição do produto." />
      <FormProduto locale={locale} />
    </div>
  );
}
