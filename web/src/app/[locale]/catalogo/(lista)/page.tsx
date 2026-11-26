import { getTranslations, setRequestLocale } from "next-intl/server";
import BuscaCatalogo from "@/components/catalogo/BuscaCatalogo";
import EstadoVazio from "@/components/catalogo/EstadoVazio";
import Trilha from "@/components/catalogo/Trilha";
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
    // pt-24 = altura da navbar fixa.
    <div className="pt-24">
      <header className="border-b border-marca-cinza-200 bg-marca-cinza-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
          <Trilha
            rotulo={t("breadcrumb")}
            passos={[{ rotulo: t("inicio"), href: `/${locale}` }, { rotulo: t("title") }]}
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-marca-preto md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-marca-cinza-500">{t("subtitulo")}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 md:pt-8">
        {produtos.length === 0 ? (
          <EstadoVazio titulo={t("unavailable")} />
        ) : (
          <BuscaCatalogo produtos={produtos} />
        )}
      </div>
    </div>
  );
}
