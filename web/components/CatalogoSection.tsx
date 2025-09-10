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

  // Retry automático: tenta a cada 5s até carregar produtos
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function fetchProdutos() {
      const data = await getProdutos();
      if (data.length > 0) {
        setProdutos(data);
        setLoading(false);
        if (interval) clearInterval(interval); // 🚀 para retries
      }
    }

    // Se não tiver produtos → tenta imediatamente
    if (!produtos.length) {
      fetchProdutos();
      interval = setInterval(fetchProdutos, 5000); // retry a cada 5s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <section id="catalogo" className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{t("title")}</h2>

      {loading ? (
        <div>
            <p className="text-center text-gray-500 mb-6">{t("loading")}</p>
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
            </div>
        </div>
        ) : produtos.length === 0 ? (
        <div className="text-center text-gray-500 py-10">{t("unavailable")}</div>
        ) : (
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((prod) => (
            <ProductCard key={prod.id} produto={prod} />
            ))}
        </div>
    )}
    </section>
  );
}