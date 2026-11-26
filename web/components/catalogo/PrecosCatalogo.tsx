"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Selo from "@/components/ui/Selo";
import { formatarMoeda } from "@/lib/formatar";
import { createClient } from "@/lib/supabase/client";

export type EstadoPreco =
  | { tipo: "carregando" }
  | { tipo: "visitante" }
  | { tipo: "admin" }
  | { tipo: "inativo" }
  | { tipo: "consulta" }
  | { tipo: "preco"; tabela: number; final: number; desconto: number };

type Precos = {
  geral: Exclude<EstadoPreco["tipo"], "preco" | "consulta"> | "lojista";
  porId: Map<string, Extract<EstadoPreco, { tipo: "preco" }>>;
};

const CARREGANDO: Precos = { geral: "carregando", porId: new Map() };

// Regra única de preço (antes só na ilha PrecoProduto): visitante e admin não
// consultam; lojista consulta precos_cliente para todos os ids numa chamada; sem
// linha para algum id, is_lojista_ativo separa "sob consulta" de "conta inativa".
async function carregarPrecos(ids: string[]): Promise<Precos> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { geral: "visitante", porId: new Map() };
  if (user.app_metadata?.papel === "admin") return { geral: "admin", porId: new Map() };

  // precos_cliente só pode ser chamada com sessão (anon não tem execute).
  const { data: linhas, error } = await supabase.rpc("precos_cliente", { p_produto_ids: ids });
  const porId: Precos["porId"] = new Map();
  for (const l of error ? [] : (linhas ?? [])) {
    porId.set(l.produto_id, {
      tipo: "preco",
      tabela: Number(l.preco_tabela),
      final: Number(l.preco_final),
      desconto: Number(l.desconto_percentual),
    });
  }
  if (ids.every((id) => porId.has(id))) return { geral: "lojista", porId };

  const { data: ativo } = await supabase.rpc("is_lojista_ativo");
  return { geral: ativo ? "lojista" : "inativo", porId };
}

const Contexto = createContext<Precos | null>(null);

/** Busca os preços de todos os produtos da lista de uma vez e os expõe aos cartões. */
export default function PrecosCatalogo({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [precos, setPrecos] = useState<Precos>(CARREGANDO);
  const chave = ids.join(",");

  useEffect(() => {
    let ativo = true;
    const lista = chave ? chave.split(",") : [];
    carregarPrecos(lista).then((p) => {
      if (ativo) setPrecos(p);
    });
    return () => {
      ativo = false;
    };
  }, [chave]);

  return <Contexto.Provider value={precos}>{children}</Contexto.Provider>;
}

/** Preço final em destaque; com desconto, preço de tabela riscado e selo "-X%". */
export function ValorPreco({
  estado,
  grande = false,
}: {
  estado: Extract<EstadoPreco, { tipo: "preco" }>;
  grande?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("catalog");
  const pct = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(estado.desconto);
  return (
    <div>
      {estado.desconto > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="preco-tabela"
            className={`text-marca-cinza-500 tabular-nums line-through ${grande ? "text-base" : "text-xs"}`}
          >
            <span className="sr-only">{t("precoTabela")}: </span>
            {formatarMoeda(estado.tabela, locale)}
          </span>
          <Selo tom="escuro" className={grande ? "" : "px-2 py-0.5 text-[11px]"}>
            -{pct}%
          </Selo>
        </div>
      )}
      <p className={`mt-0.5 flex items-baseline gap-1.5 ${grande ? "" : "flex-wrap"}`}>
        <span
          data-testid="preco-final"
          className={`font-bold tracking-tight text-marca-preto tabular-nums ${grande ? "text-4xl" : "text-xl"}`}
        >
          {formatarMoeda(estado.final, locale)}
        </span>
        <span className={`text-marca-cinza-500 ${grande ? "text-sm" : "text-xs"}`}>{t("porUnidade")}</span>
      </p>
    </div>
  );
}

/** Estado de preço de um produto; precisa de um <PrecosCatalogo> que inclua o id. */
export function usePreco(produtoId: string): EstadoPreco {
  const precos = useContext(Contexto);
  if (!precos) throw new Error("usePreco fora de <PrecosCatalogo>");
  if (precos.geral !== "lojista") return { tipo: precos.geral };
  return precos.porId.get(produtoId) ?? { tipo: "consulta" };
}
