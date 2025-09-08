"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Produto } from "@/types/Produto";
import Link from "next/link";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";

export default function ProdutoDetalhe({ produto }: { produto: Produto }) {
  const t = useTranslations("product");
  const attr = produto;
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL

  // Galeria de imagens
  const imagens: string[] =
    attr.imagens?.map((img) => `${img.url}`) ?? [];
  const [imagemAtiva, setImagemAtiva] = useState(imagens[0]);

  // Abas
  const tabs = ["description", "specifications", "applications"] as const;
  type Tab = typeof tabs[number];
  const [aba, setAba] = useState<Tab>("description");

  return (
    <div>
      {/* BOTÃO VOLTAR */}
      <div className="mb-6 pt-20">
        <Link href="/#catalogo" className="text-blue-800 hover:underline text-sm">
          ← {t("backToCatalog")}
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Galeria */}
        <div>
          <div className="relative w-full h-80 border rounded-lg overflow-hidden">
            {imagemAtiva ? (
              <Image
                src={imagemAtiva}
                alt={attr.nome}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                {t("noImage")}
              </div>
            )}
          </div>
          {imagens.length > 1 && (
            <div className="flex gap-3 mt-4">
              {imagens.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <Image
                    src={img}
                    alt={`${attr.nome} ${i + 1}`}
                    fill
                    className={`object-cover border rounded cursor-pointer transition-all ${
                      imagemAtiva === img
                        ? "ring-2 ring-blue-500"
                        : "hover:opacity-80"
                    }`}
                    onClick={() => setImagemAtiva(img)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div>
          <span className="bg-blue-900 text-white px-3 py-1 rounded text-sm font-semibold">
            {attr.codigo}
          </span>
          <h1 className="text-3xl font-bold mt-4 text-gray-800">
            {attr.nome}
          </h1>
          {attr.destaque && (
            <p className="mt-2 text-gray-600 italic">{attr.destaque}</p>
          )}

          <div className="flex gap-4 mt-8">
            <Link
              href="/#contato"
              className="bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              {t("requestQuote")}
            </Link>
            {attr.manual && (
              <a
                href={attr.manual.url}
                download
                className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
              >
                📄 {t("downloadManual")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-12">
        {/* Header */}
        <div className="flex gap-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`pb-3 font-semibold transition-colors ${
                aba === tab
                  ? "border-b-2 border-blue-800 text-blue-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setAba(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="mt-6 text-gray-700 leading-relaxed">
          {aba === "description" && produto.descricao && (
           <BlocksRenderer content={produto.descricao}/>
          )}

          {aba === "specifications" && (
            <div className="bg-gray-50 border rounded-lg">
              {attr.especificacoes.length ? (
                attr.especificacoes.map((esp) => (
                  <div
                    key={esp.id}
                    className="flex justify-between px-4 py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium text-gray-700">{esp.nome}</span>
                    <span className="text-gray-600">{esp.valor}</span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-gray-500">{t("noSpecs")}</p>
              )}
            </div>
          )}

          {aba === "applications" && attr.aplicacoes && (
            <BlocksRenderer content={attr.aplicacoes}/>
          )}
        </div>
      </div>
    </div>
  );
}