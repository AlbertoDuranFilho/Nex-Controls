import { getTranslations, setRequestLocale } from "next-intl/server";
import BuscaCatalogo from "@/components/catalogo/BuscaCatalogo";
import { listarProdutosPublicos } from "@/services/catalogo";

export const revalidate = 3600;

export default async function CatalogoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [produtos, t] = await Promise.all([listarProdutosPublicos(), getTranslations("catalog")]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-32">
      <h1 className="mb-8 text-3xl font-bold text-marca-preto">{t("title")}</h1>
      {produtos.length === 0 ? (
        <p className="py-10 text-marca-cinza-500">{t("unavailable")}</p>
      ) : (
        <BuscaCatalogo produtos={produtos} />
      )}
    </div>
  );
}
