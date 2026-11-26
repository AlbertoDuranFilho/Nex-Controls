"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownUp, ChevronDown, Search, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import EstadoVazio from "@/components/catalogo/EstadoVazio";
import PrecosCatalogo from "@/components/catalogo/PrecosCatalogo";
import Botao from "@/components/ui/Botao";
import { classeCampo } from "@/components/ui/Campo";
import type { ProdutoPublico } from "@/services/catalogo";

type Ordem = "nome" | "codigo";

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function BuscaCatalogo({ produtos }: { produtos: ProdutoPublico[] }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("nome");

  const ids = useMemo(() => produtos.map((p) => p.id), [produtos]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const lista = termo
      ? produtos.filter((p) => normalizar(`${p.nome} ${p.codigo}`).includes(termo))
      : [...produtos];
    const colacao = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    return lista.sort((a, b) => colacao.compare(a[ordem], b[ordem]));
  }, [busca, ordem, produtos, locale]);

  return (
    <PrecosCatalogo ids={ids}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="group relative w-full sm:max-w-md">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-marca-cinza-400 transition-colors group-focus-within:text-marca-preto"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("buscaPlaceholder")}
            aria-label={t("buscar")}
            className={`${classeCampo} pr-11 pl-11 [&::-webkit-search-cancel-button]:hidden`}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label={t("limparBusca")}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-marca-cinza-500 transition-colors hover:bg-marca-cinza-100 hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-sm text-marca-cinza-500 tabular-nums" aria-live="polite">
            {t("contagem", { count: filtrados.length })}
          </p>
          <label className="group relative flex items-center">
            <span className="sr-only">{t("ordenar")}</span>
            <ArrowDownUp
              aria-hidden
              className="pointer-events-none absolute left-3.5 size-4 text-marca-cinza-500 group-focus-within:text-marca-preto"
            />
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
              className={`${classeCampo} h-11 w-auto cursor-pointer appearance-none pr-10 pl-10 text-sm font-medium`}
            >
              <option value="nome">{t("ordemNome")}</option>
              <option value="codigo">{t("ordemCodigo")}</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 size-4 text-marca-cinza-500" />
          </label>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio titulo={t("nenhumResultado")} dica={t("vazioDica")}>
          <Botao variante="secundario" tamanho="sm" icone={X} onClick={() => setBusca("")} className="mt-6">
            {t("limparBusca")}
          </Botao>
        </EstadoVazio>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtrados.map((p) => (
            <li key={p.id} className="min-w-0">
              <ProductCard produto={p} />
            </li>
          ))}
        </ul>
      )}
    </PrecosCatalogo>
  );
}
