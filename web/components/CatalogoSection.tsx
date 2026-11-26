import { useLocale, useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import EstadoVazio from "@/components/catalogo/EstadoVazio";
import PrecosCatalogo from "@/components/catalogo/PrecosCatalogo";
import Botao from "@/components/ui/Botao";
import type { ProdutoPublico } from "@/services/catalogo";

const DESTAQUES = 8;

export default function CatalogoSection({ produtos }: { produtos: ProdutoPublico[] }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const destaques = produtos.slice(0, DESTAQUES);

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">{t("title")}</h2>

      {destaques.length === 0 ? (
        <EstadoVazio titulo={t("unavailable")} />
      ) : (
        <>
          <PrecosCatalogo ids={destaques.map((p) => p.id)}>
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {destaques.map((p) => (
                <li key={p.id} className="min-w-0">
                  <ProductCard produto={p} />
                </li>
              ))}
            </ul>
          </PrecosCatalogo>
          <div className="mt-10 text-center">
            <Botao href={`/${locale}/catalogo`} variante="secundario" tamanho="lg">
              {t("verCatalogoCompleto")}
            </Botao>
          </div>
        </>
      )}
    </section>
  );
}
