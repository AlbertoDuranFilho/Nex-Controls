import { FormNovoLojista } from "@/components/admin/FormLojista";

export default async function NovoLojistaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-marca-preto">Novo cliente</h1>
      <FormNovoLojista locale={locale} />
    </div>
  );
}
