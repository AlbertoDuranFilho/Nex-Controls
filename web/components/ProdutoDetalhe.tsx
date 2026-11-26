"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { FileText, ImageOff, MessageSquare } from "lucide-react";
import { imagemNaoOtimizada } from "@/lib/imagem";
import PrecoProduto from "@/components/catalogo/PrecoProduto";
import TextoProduto from "@/components/catalogo/TextoProduto";
import Trilha from "@/components/catalogo/Trilha";
import Botao from "@/components/ui/Botao";
import type { ProdutoPublico } from "@/services/catalogo";

const tabs = ["description", "specifications", "applications"] as const;
type Tab = (typeof tabs)[number];

export default function ProdutoDetalhe({ produto }: { produto: ProdutoPublico }) {
  const t = useTranslations("product");
  const tc = useTranslations("catalog");
  const locale = useLocale();

  const [imagemAtiva, setImagemAtiva] = useState(produto.imagens[0]);
  const [aba, setAba] = useState<Tab>("description");

  return (
    <div>
      <Trilha
        rotulo={tc("breadcrumb")}
        passos={[
          { rotulo: tc("inicio"), href: `/${locale}` },
          { rotulo: tc("title"), href: `/${locale}/catalogo` },
          { rotulo: produto.nome },
        ]}
      />

      <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-14">
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-marca-cinza-200 bg-marca-cinza-50">
            {imagemAtiva ? (
              <Image
                src={imagemAtiva.url}
                unoptimized={imagemNaoOtimizada(imagemAtiva.url)}
                alt={imagemAtiva.alt ?? produto.nome}
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain p-8 sm:p-12"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-marca-cinza-500">
                <ImageOff aria-hidden className="size-12 text-marca-cinza-300" strokeWidth={1.25} />
                {t("noImage")}
              </div>
            )}
          </div>
          {produto.imagens.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {produto.imagens.map((img, i) => {
                const ativa = imagemAtiva?.url === img.url;
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setImagemAtiva(img)}
                    aria-pressed={ativa}
                    className={`relative size-20 shrink-0 overflow-hidden rounded-xl border bg-marca-cinza-50 transition duration-200 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none ${
                      ativa
                        ? "border-marca-preto ring-1 ring-marca-preto"
                        : "border-marca-cinza-200 hover:border-marca-cinza-400"
                    }`}
                  >
                    <Image
                      src={img.url}
                      unoptimized={imagemNaoOtimizada(img.url)}
                      alt={img.alt ?? `${produto.nome} ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain p-2"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="self-start rounded-full bg-marca-cinza-100 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-marca-preto ring-1 ring-marca-cinza-200 ring-inset">
            {produto.codigo}
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-marca-preto sm:text-3xl lg:text-4xl">
            {produto.nome}
          </h1>
          {produto.destaque && <p className="mt-3 text-[15px] text-marca-cinza-600">{produto.destaque}</p>}
          {produto.compatibilidade && (
            <p className="mt-3 text-sm text-marca-cinza-600">
              <span className="font-medium text-marca-cinza-800">{t("compatibility")}:</span>{" "}
              {produto.compatibilidade}
            </p>
          )}

          <div className="mt-6">
            <PrecoProduto produtoId={produto.id} nomeProduto={produto.nome} />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Botao href={`/${locale}#contato`} variante="secundario" icone={MessageSquare}>
              {t("requestQuote")}
            </Botao>
            {produto.manual_url && (
              <Botao
                href={produto.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                variante="secundario"
                icone={FileText}
              >
                {t("downloadManual")}
              </Botao>
            )}
          </div>
        </div>
      </div>

      <div className="mt-14">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 rounded-xl bg-marca-cinza-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={aba === tab}
                className={`h-10 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition duration-200 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none motion-reduce:transition-none ${
                  aba === tab
                    ? "bg-marca-branco text-marca-preto shadow-suave"
                    : "text-marca-cinza-600 hover:text-marca-preto"
                }`}
                onClick={() => setAba(tab)}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 max-w-3xl leading-relaxed text-marca-cinza-700">
          {aba === "description" && <TextoProduto texto={produto.descricao} />}

          {aba === "specifications" &&
            (produto.especificacoes.length ? (
              <div className="overflow-hidden rounded-2xl border border-marca-cinza-200">
                <table className="w-full text-sm">
                  <tbody>
                    {produto.especificacoes.map((esp, i) => (
                      <tr
                        key={`${esp.nome}-${i}`}
                        className="border-b border-marca-cinza-200 last:border-b-0 odd:bg-marca-cinza-50 even:bg-marca-branco"
                      >
                        <th scope="row" className="w-1/2 px-4 py-3 text-left font-medium text-marca-cinza-800 sm:px-5">
                          {esp.nome}
                        </th>
                        <td className="px-4 py-3 text-marca-cinza-600 sm:px-5">{esp.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-2xl bg-marca-cinza-50 p-5 text-marca-cinza-500">{t("noSpecs")}</p>
            ))}

          {aba === "applications" &&
            (produto.aplicacoes ? (
              <TextoProduto texto={produto.aplicacoes} />
            ) : (
              <p className="rounded-2xl bg-marca-cinza-50 p-5 text-marca-cinza-500">{t("noApplications")}</p>
            ))}
        </div>
      </div>
    </div>
  );
}
