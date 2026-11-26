import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Carrinho from "@/components/carrinho/Carrinho";
import { simularCarrinho } from "@/services/carrinho";

type Props = { params: Promise<{ locale: string }> };

// Dinâmica (atrás do login): uma chamada a simular_pedido no carregamento.
// Sem sessão vai ao login; erro do banco mostra uma mensagem (não desloga o cliente).
export default async function CarrinhoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "carrinho" });
  const r = await simularCarrinho();
  if (!r.ok && r.motivo === "sem_sessao") redirect(`/${locale}/cliente/login`);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-marca-preto">{t("titulo")}</h1>
      {r.ok ? (
        <Carrinho locale={locale} inicial={r.sim} />
      ) : (
        <p role="alert" className="text-sm text-marca-preto">
          {t("erroCarregar")}
        </p>
      )}
    </div>
  );
}
