"use client";

import { useEffect, useState } from "react";
import { getProdutos } from "@/services/strapi";
import ProductCard from "@/components/ProductCard";
import { useTranslations } from "next-intl";
import type { Produto } from "@/types/Produto";

function ProductSkeleton() {
  return (
    <div className="flex flex-col h-full bg-gray-200 animate-pulse rounded-lg overflow-hidden">
      <div className="h-32 bg-gray-300" />
      <div className="p-4 flex flex-col flex-grow items-center justify-center">
        <div className="h-4 w-24 bg-gray-300 mb-2 rounded" />
        <div className="h-3 w-16 bg-gray-300 rounded" />
      </div>
      <div className="h-8 bg-gray-300" />
    </div>
  );
}

export default function CatalogoSection({ initialProdutos }: { initialProdutos: Produto[] }) {
  const t = useTranslations("catalog");
  const [produtos, setProdutos] = useState<Produto[]>(initialProdutos);
  const [loading, setLoading] = useState(!initialProdutos.length);

  // ⚡ Se não recebeu produtos no SSR, tenta buscar no cliente assim que o Strapi “acordar”
  useEffect(() => {
    if (!produtos.length) {
      getProdutos().then((data) => {
        if (data.length) setProdutos(data);
        setLoading(false);
      });
    }
  }, []);

  return (
    <section id="catalogo" className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{t("title")}</h2>

      {loading ? (
        // Enquanto busca → mostrar skeletons
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : produtos.length === 0 ? (
        // Se ainda não veio nada
        <div className="text-center text-gray-500 py-10">{t("unavailable")}</div>
      ) : (
        // Render normal dos produtos
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {produtos.map((prod) => (
            <ProductCard key={prod.id} produto={prod} />
          ))}
        </div>
      )}
    </section>
  );
}