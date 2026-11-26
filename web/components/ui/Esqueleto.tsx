"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

// Blocos cinza pulsando enquanto a página busca os dados (usados nos loading.tsx).
// A navegação troca de tela na hora; o conteúdo entra no lugar quando chega.

export function Bloco({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-marca-cinza-200/70 motion-reduce:animate-none ${className}`} />;
}

function Carregando({ children }: { children: ReactNode }) {
  const t = useTranslations("comum");
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t("carregando")}</span>
      {children}
    </div>
  );
}

// Título + barra de busca + linhas (listas de clientes, produtos, pedidos, cupons).
export function EsqueletoLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <Carregando>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Bloco className="h-8 w-40" />
        <Bloco className="h-10 w-32" />
      </div>
      <Bloco className="mb-6 h-11 w-full max-w-md" />
      <div className="space-y-3 rounded-2xl bg-marca-branco p-4 ring-1 ring-marca-cinza-200/70">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Bloco className="size-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Bloco className="h-4 w-2/5" />
              <Bloco className="h-3 w-1/4" />
            </div>
            <Bloco className="hidden h-6 w-20 sm:block" />
          </div>
        ))}
      </div>
    </Carregando>
  );
}

// Grade de cartões de produto (catálogo).
export function EsqueletoCartoes({ cartoes = 8 }: { cartoes?: number }) {
  return (
    <Carregando>
      <Bloco className="mb-6 h-11 w-full max-w-xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: cartoes }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-marca-branco ring-1 ring-marca-cinza-200/70">
            <Bloco className="aspect-square rounded-none" />
            <div className="space-y-3 p-4">
              <Bloco className="h-4 w-16" />
              <Bloco className="h-4 w-full" />
              <Bloco className="h-7 w-24" />
              <Bloco className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Carregando>
  );
}

// Página de detalhe (pedido, cadastro): cabeçalho + dois cartões.
export function EsqueletoDetalhe() {
  return (
    <Carregando>
      <Bloco className="mb-2 h-4 w-28" />
      <Bloco className="mb-6 h-8 w-56" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl bg-marca-branco p-5 ring-1 ring-marca-cinza-200/70 lg:col-span-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Bloco key={i} className="h-5 w-full" />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl bg-marca-branco p-5 ring-1 ring-marca-cinza-200/70">
          <Bloco className="h-5 w-2/3" />
          <Bloco className="h-5 w-1/2" />
          <Bloco className="h-11 w-full" />
        </div>
      </div>
    </Carregando>
  );
}
