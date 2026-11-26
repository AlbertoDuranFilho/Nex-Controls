import { getTranslations, setRequestLocale } from "next-intl/server";
import BuscaCatalogo from "@/components/catalogo/BuscaCatalogo";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { listarProdutosPublicos, type ProdutoPublico } from "@/services/catalogo";

export const revalidate = 3600;

// No build o banco pode ainda não ter as tabelas (o deploy do banco roda depois
// do merge). Só nesse momento a falha vira lista vazia; a página é refeita pelo
// ISR ou pelo revalidateTag("catalogo") da importação. Em execução, o erro sobe.
async function produtosParaPagina(): Promise<ProdutoPublico[]> {
  try {
    return await listarProdutosPublicos();
  } catch (e) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw e;
    console.warn("Catálogo vazio no build (banco indisponível):", e);
    return [];
  }
}

export default async function CatalogoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [produtos, t] = await Promise.all([produtosParaPagina(), getTranslations("catalog")]);

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
