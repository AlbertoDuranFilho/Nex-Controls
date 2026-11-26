"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import type { ProdutoPublico } from "@/services/catalogo";

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function BuscaCatalogo({ produtos }: { produtos: ProdutoPublico[] }) {
  const t = useTranslations("catalog");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return produtos;
    return produtos.filter((p) => normalizar(`${p.nome} ${p.codigo}`).includes(termo));
  }, [busca, produtos]);

  return (
    <div>
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={t("buscaPlaceholder")}
        aria-label={t("buscar")}
        className="mb-8 w-full border border-marca-cinza-300 px-4 py-3 text-marca-preto placeholder:text-marca-cinza-500 md:max-w-md"
      />
      {filtrados.length === 0 ? (
        <p className="py-10 text-center text-marca-cinza-500">{t("nenhumResultado")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      )}
    </div>
  );
}
