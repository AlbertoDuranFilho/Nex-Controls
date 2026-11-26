"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ImageOff, Lock, MessageCircle } from "lucide-react";
import AdicionarAoCarrinho from "@/components/catalogo/AdicionarAoCarrinho";
import { usePreco, ValorPreco } from "@/components/catalogo/PrecosCatalogo";
import Botao from "@/components/ui/Botao";
import { imagemNaoOtimizada } from "@/lib/imagem";
import type { ProdutoPublico } from "@/services/catalogo";

// Cartão inteiro leva ao detalhe pelo link do nome (estendido com ::after); a área
// de compra fica acima dele (z-10), então não há botão dentro de <a>.
export default function ProductCard({ produto }: { produto: ProdutoPublico }) {
  const locale = useLocale();
  const img = produto.imagens[0];

  return (
    <article className="group/cartao @container relative flex h-full flex-col overflow-hidden rounded-2xl border border-marca-cinza-200 bg-marca-branco shadow-sm transition duration-300 hover:-translate-y-1 hover:border-marca-cinza-300 hover:shadow-lg has-[.link-cartao:focus-visible]:ring-2 has-[.link-cartao:focus-visible]:ring-marca-preto has-[.link-cartao:focus-visible]:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-square overflow-hidden bg-marca-cinza-50">
        {img ? (
          <Image
            src={img.url}
            unoptimized={imagemNaoOtimizada(img.url)}
            alt={img.alt ?? produto.nome}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-4 transition-transform duration-300 group-hover/cartao:scale-105 motion-reduce:transition-none motion-reduce:group-hover/cartao:scale-100 sm:p-8"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <ImageOff aria-hidden className="size-10 text-marca-cinza-300" strokeWidth={1.25} />
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-marca-branco px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-marca-preto shadow-sm ring-1 ring-marca-cinza-200">
          {produto.codigo}
        </span>
      </div>

      <div className="flex flex-1 flex-col border-t border-marca-cinza-100 p-3.5 sm:p-5">
        <h3 className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-medium text-marca-preto sm:text-[15px]">
          <Link
            href={`/${locale}/catalogo/${produto.slug}`}
            className="link-cartao after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none"
          >
            {produto.nome}
          </Link>
        </h3>
        <div className="mt-auto pt-4">
          <AreaPreco produto={produto} />
        </div>
      </div>
    </article>
  );
}

function AreaPreco({ produto }: { produto: ProdutoPublico }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const estado = usePreco(produto.id);

  switch (estado.tipo) {
    case "carregando":
      return (
        <div aria-hidden="true" className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-md bg-marca-cinza-100 motion-reduce:animate-none" />
          <div className="h-11 animate-pulse rounded-xl bg-marca-cinza-100 motion-reduce:animate-none" />
        </div>
      );
    case "visitante":
      return (
        <Botao
          href={`/${locale}/cliente/login?next=${encodeURIComponent(`/${locale}/catalogo`)}`}
          variante="secundario"
          icone={Lock}
          multilinha
          // Cartão estreito (2 colunas no celular): sem o cadeado o rótulo quebra em 2 linhas, não 4.
          className="relative z-10 w-full px-3 [&>svg]:hidden @[13rem]:[&>svg]:block"
        >
          {t("entrarParaVerPrecos")}
        </Botao>
      );
    case "admin":
      return (
        <p className="flex items-center gap-1.5 text-sm font-medium text-marca-cinza-600 transition-colors group-hover/cartao:text-marca-preto">
          {t("verDetalhes")}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover/cartao:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/cartao:translate-x-0"
          />
        </p>
      );
    case "inativo":
    case "consulta":
      return (
        <p className="flex h-11 items-center gap-2 rounded-xl bg-marca-cinza-50 px-3 text-sm font-medium text-marca-cinza-700">
          <MessageCircle aria-hidden className="size-4" />
          {t("sobConsultaCurto")}
        </p>
      );
    case "preco":
      return (
        <div>
          <ValorPreco estado={estado} />
          <div className="relative z-10 mt-3">
            <AdicionarAoCarrinho produtoId={produto.id} nomeProduto={produto.nome} compacto />
          </div>
        </div>
      );
  }
}
