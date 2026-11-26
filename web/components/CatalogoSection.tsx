import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import type { ProdutoPublico } from "@/services/catalogo";

const DESTAQUES = 8;

export default function CatalogoSection({ produtos }: { produtos: ProdutoPublico[] }) {
  const t = useTranslations("catalog");
  const locale = useLocale();

  return (
    <section id="catalogo" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-10 text-center text-3xl font-bold">{t("title")}</h2>

      {produtos.length === 0 ? (
        <div className="py-10 text-center text-marca-cinza-500">{t("unavailable")}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {produtos.slice(0, DESTAQUES).map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={`/${locale}/catalogo`}
              className="inline-block border border-marca-preto px-6 py-3 text-sm font-semibold text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
            >
              {t("verCatalogoCompleto")}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
