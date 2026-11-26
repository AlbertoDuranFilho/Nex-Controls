"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

// Ilha client: só aparece para lojista logado. Conta a soma das quantidades do carrinho.
export default function IconeCarrinho({ onNavegar }: { onNavegar?: () => void }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const pathname = usePathname();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;

    async function contar() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.app_metadata?.papel !== "lojista") {
        if (ativo) setTotal(null);
        return;
      }
      const { data: itens, error } = await supabase.from("carrinho_itens").select("quantidade");
      if (!ativo || error) return;
      setTotal(itens.reduce((soma, i) => soma + i.quantidade, 0));
    }

    contar();
    const { data } = supabase.auth.onAuthStateChange(() => {
      contar();
    });
    window.addEventListener("carrinho:atualizado", contar);
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
      window.removeEventListener("carrinho:atualizado", contar);
    };
  }, [pathname]);

  if (total === null) return null;

  return (
    <Link
      href={`/${locale}/cliente/carrinho`}
      onClick={onNavegar}
      data-testid="icone-carrinho"
      aria-label={`${t("carrinho")}: ${total}`}
      className="relative flex h-9 items-center gap-1.5 text-marca-preto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 20.5h.01M17 20.5h.01"
        />
      </svg>
      <span className="min-w-5 bg-marca-preto px-1.5 text-center text-xs font-semibold text-marca-branco">
        {total}
      </span>
    </Link>
  );
}
