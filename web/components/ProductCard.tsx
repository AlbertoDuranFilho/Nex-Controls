import Image from "next/image";
import { imagemNaoOtimizada } from "@/lib/imagem";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ProdutoPublico } from "@/services/catalogo";

export default function ProductCard({ produto }: { produto: ProdutoPublico }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const img = produto.imagens[0];

  return (
    <div className="flex h-full flex-col overflow-hidden border border-marca-cinza-200 bg-marca-branco transition-colors hover:border-marca-preto">
      <div className="relative flex h-32 w-full items-center justify-center bg-marca-branco p-4">
        {img ? (
          <Image
            src={img.url}
            unoptimized={imagemNaoOtimizada(img.url)}
            alt={img.alt ?? produto.nome}
            width={160}
            height={120}
            className="max-h-[100px] object-contain"
          />
        ) : (
          <div className="h-full w-full bg-marca-cinza-100" />
        )}
        <span className="absolute left-2 top-2 z-10 bg-marca-preto px-2 py-1 text-xs font-semibold text-marca-branco">
          {produto.codigo}
        </span>
      </div>

      <div className="flex flex-grow flex-col items-center px-4 pb-4 text-center">
        <p className="mt-1 flex-grow text-sm text-marca-cinza-700">{produto.nome}</p>
      </div>

      <Link
        href={`/${locale}/catalogo/${produto.slug}`}
        className="block bg-marca-preto py-2 text-center text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800"
      >
        {t("learnMore")} →
      </Link>
    </div>
  );
}
