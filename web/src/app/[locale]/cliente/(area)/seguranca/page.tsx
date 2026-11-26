import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import CartaoConta, { CabecalhoConta } from "@/components/conta/CartaoConta";
import FormSenha from "@/components/conta/FormSenha";
import { flags } from "@/lib/flags";

type Props = { params: Promise<{ locale: string }> };

// Troca de senha implementada, mas oculta atras de FEATURE_TROCA_SENHA.
export default async function SegurancaPage({ params }: Props) {
  if (!flags.trocaSenha) notFound();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta.seguranca" });

  return (
    <div className="space-y-6">
      <CabecalhoConta icone={ShieldCheck} titulo={t("titulo")}>
        {t("descricao")}
      </CabecalhoConta>
      <CartaoConta>
        <FormSenha locale={locale} />
      </CartaoConta>
    </div>
  );
}
