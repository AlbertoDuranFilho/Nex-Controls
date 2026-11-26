"use client";

import { useState } from "react";
import Image from "next/image";
import { imagemNaoOtimizada } from "@/lib/imagem";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import PrecoProduto from "@/components/catalogo/PrecoProduto";
import TextoProduto from "@/components/catalogo/TextoProduto";
import type { ProdutoPublico } from "@/services/catalogo";

const tabs = ["description", "specifications", "applications"] as const;
type Tab = (typeof tabs)[number];

export default function ProdutoDetalhe({ produto }: { produto: ProdutoPublico }) {
  const t = useTranslations("product");
  const locale = useLocale();

  const [imagemAtiva, setImagemAtiva] = useState(produto.imagens[0]);
  const [aba, setAba] = useState<Tab>("description");

  return (
    <div>
      <div className="mb-6 pt-20">
        <Link
          href={`/${locale}/catalogo`}
          className="text-sm text-marca-cinza-700 underline-offset-2 hover:text-marca-preto hover:underline"
        >
          ← {t("backToCatalog")}
        </Link>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative h-80 w-full overflow-hidden border border-marca-cinza-200">
            {imagemAtiva ? (
              <Image
                src={imagemAtiva.url}
                unoptimized={imagemNaoOtimizada(imagemAtiva.url)}
                alt={imagemAtiva.alt ?? produto.nome}
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-marca-cinza-100 text-marca-cinza-500">
                {t("noImage")}
              </div>
            )}
          </div>
          {produto.imagens.length > 1 && (
            <div className="mt-4 flex gap-3">
              {produto.imagens.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setImagemAtiva(img)}
                  className={`relative h-20 w-20 border ${
                    imagemAtiva?.url === img.url
                      ? "border-marca-preto"
                      : "border-marca-cinza-200 hover:border-marca-cinza-500"
                  }`}
                >
                  <Image
                    src={img.url}
                    unoptimized={imagemNaoOtimizada(img.url)}
                    alt={img.alt ?? `${produto.nome} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="bg-marca-preto px-3 py-1 text-sm font-semibold text-marca-branco">
            {produto.codigo}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-marca-preto">{produto.nome}</h1>
          {produto.destaque && (
            <p className="mt-2 italic text-marca-cinza-600">{produto.destaque}</p>
          )}
          {produto.compatibilidade && (
            <p className="mt-2 text-sm text-marca-cinza-600">
              {t("compatibility")}: {produto.compatibilidade}
            </p>
          )}

          <div className="mt-6">
            <PrecoProduto produtoId={produto.id} />
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href={`/${locale}#contato`}
              className="border border-marca-preto px-6 py-3 font-semibold text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
            >
              {t("requestQuote")}
            </Link>
            {produto.manual_url && (
              <a
                href={produto.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-marca-cinza-300 px-6 py-3 font-semibold text-marca-preto transition-colors hover:bg-marca-cinza-100"
              >
                {t("downloadManual")}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex gap-6 border-b border-marca-cinza-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pb-3 font-semibold transition-colors ${
                aba === tab
                  ? "border-b-2 border-marca-preto text-marca-preto"
                  : "text-marca-cinza-500 hover:text-marca-cinza-800"
              }`}
              onClick={() => setAba(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        <div className="mt-6 leading-relaxed text-marca-cinza-700">
          {aba === "description" && <TextoProduto texto={produto.descricao} />}

          {aba === "specifications" &&
            (produto.especificacoes.length ? (
              <div className="border border-marca-cinza-200 bg-marca-cinza-50">
                {produto.especificacoes.map((esp, i) => (
                  <div
                    key={`${esp.nome}-${i}`}
                    className="flex justify-between border-b border-marca-cinza-200 px-4 py-2 last:border-b-0"
                  >
                    <span className="font-medium text-marca-cinza-800">{esp.nome}</span>
                    <span className="text-marca-cinza-600">{esp.valor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-marca-cinza-500">{t("noSpecs")}</p>
            ))}

          {aba === "applications" &&
            (produto.aplicacoes ? (
              <TextoProduto texto={produto.aplicacoes} />
            ) : (
              <p className="p-4 text-marca-cinza-500">{t("noApplications")}</p>
            ))}
        </div>
      </div>
    </div>
  );
}
