"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
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
  const ativo = pathname === `/${locale}/cliente/carrinho`;

  return (
    <Link
      href={`/${locale}/cliente/carrinho`}
      onClick={onNavegar}
      data-testid="icone-carrinho"
      aria-label={`${t("carrinho")}: ${total}`}
      aria-current={ativo ? "page" : undefined}
      className={`relative grid size-11 shrink-0 place-items-center rounded-xl text-marca-preto transition duration-200 hover:bg-marca-cinza-100 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none motion-reduce:transition-none ${
        ativo ? "bg-marca-cinza-100" : ""
      }`}
    >
      <ShoppingCart aria-hidden className="size-[22px]" strokeWidth={1.75} />
      <span
        aria-hidden="true"
        className={`absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums ring-2 ring-marca-branco transition-colors ${
          total > 0 ? "bg-marca-preto text-marca-branco" : "bg-marca-cinza-200 text-marca-cinza-700"
        }`}
      >
        {total > 99 ? "99+" : total}
      </span>
    </Link>
  );
}
