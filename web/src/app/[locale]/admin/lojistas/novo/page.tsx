import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { FormNovoLojista } from "@/components/admin/FormLojista";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import { ehAdmin } from "@/lib/auth/exigir-admin";

export default async function NovoLojistaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  return (
    <div>
      <VoltarAdmin href={`/${locale}/admin/lojistas`}>Voltar para clientes</VoltarAdmin>
      <CabecalhoAdmin
        titulo="Novo cliente"
        descricao="O tipo de pessoa segue o documento digitado. A senha provisória aparece uma única vez."
      />
      <FormNovoLojista locale={locale} />
    </div>
  );
}
