import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Carrinho from "@/components/carrinho/Carrinho";
import { simularCarrinho } from "@/services/carrinho";

type Props = { params: Promise<{ locale: string }> };

// Dinâmica (atrás do login): uma chamada a simular_pedido no carregamento.
export default async function CarrinhoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "carrinho" });
  const simulacao = await simularCarrinho();
  if (!simulacao) redirect(`/${locale}/cliente/login`);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-marca-preto">{t("titulo")}</h1>
      <Carrinho locale={locale} inicial={simulacao} />
    </div>
  );
}
