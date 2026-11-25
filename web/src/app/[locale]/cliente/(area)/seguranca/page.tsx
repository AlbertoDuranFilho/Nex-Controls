import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import FormSenha from "@/components/conta/FormSenha";
import { flags } from "@/lib/flags";

type Props = { params: Promise<{ locale: string }> };

// Troca de senha implementada, mas oculta atras de FEATURE_TROCA_SENHA.
export default async function SegurancaPage({ params }: Props) {
  if (!flags.trocaSenha) notFound();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta.seguranca" });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-marca-preto">{t("titulo")}</h1>
      <FormSenha locale={locale} />
    </div>
  );
}
