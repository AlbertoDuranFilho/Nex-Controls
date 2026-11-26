import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CircleAlert, ShoppingCart } from "lucide-react";
import Carrinho from "@/components/carrinho/Carrinho";
import { CabecalhoConta } from "@/components/conta/CartaoConta";
import { miniaturasProdutos } from "@/services/catalogo";
import { simularCarrinho } from "@/services/carrinho";

type Props = { params: Promise<{ locale: string }> };

// Dinâmica (atrás do login): uma chamada a simular_pedido no carregamento.
// Sem sessão vai ao login; erro do banco mostra uma mensagem (não desloga o cliente).
export default async function CarrinhoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "carrinho" });
  const r = await simularCarrinho();
  if (!r.ok && r.motivo === "sem_sessao") redirect(`/${locale}/cliente/login`);
  // Miniaturas e links só para exibir; o carrinho em si vem todo de simular_pedido.
  const miniaturas = r.ok ? await miniaturasProdutos(r.sim.itens.map((i) => i.produto_id)) : {};

  return (
    <div className="space-y-6">
      <CabecalhoConta icone={ShoppingCart} titulo={t("titulo")} />
      {r.ok ? (
        <Carrinho locale={locale} inicial={r.sim} miniaturas={miniaturas} />
      ) : (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-5 text-sm text-marca-preto shadow-sm"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("erroCarregar")}
        </p>
      )}
    </div>
  );
}
