import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import ImportarPlanilha from "@/components/admin/ImportarPlanilha";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import { ehAdmin } from "@/lib/auth/exigir-admin";

export default async function ImportarProdutosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  return (
    <div className="max-w-4xl">
      <VoltarAdmin href={`/${locale}/admin/produtos`}>Voltar para produtos</VoltarAdmin>
      <CabecalhoAdmin
        titulo="Importar planilha de produtos"
        descricao="Você vê uma prévia antes de confirmar; nada muda até clicar em Importar."
      />
      <ImportarPlanilha />
    </div>
  );
}
