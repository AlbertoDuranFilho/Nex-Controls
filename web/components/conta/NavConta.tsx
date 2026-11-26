"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// Lateral no desktop, abas rolaveis no mobile. "Seguranca" so existe com a flag ligada;
// o valor vem de um Server Component porque a flag e env so de servidor.
export default function NavConta({
  locale,
  trocaSenha,
}: {
  locale: string;
  trocaSenha: boolean;
}) {
  const t = useTranslations("conta.nav");
  const pathname = usePathname();
  const base = `/${locale}/cliente`;
  const itens = [
    { href: base, rotulo: t("meusDados") },
    { href: `${base}/endereco`, rotulo: t("endereco") },
    { href: `${base}/carrinho`, rotulo: t("carrinho") },
    ...(trocaSenha ? [{ href: `${base}/seguranca`, rotulo: t("seguranca") }] : []),
  ];

  return (
    <nav
      aria-label={t("aria")}
      className="-mx-6 flex gap-1 overflow-x-auto border-b border-marca-cinza-200 px-6 md:mx-0 md:w-56 md:shrink-0 md:flex-col md:gap-0 md:overflow-visible md:border-r md:border-b-0 md:px-0"
    >
      {itens.map(({ href, rotulo }) => {
        const ativo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors md:border-b-0 md:border-l-2 md:px-5 ${
              ativo
                ? "border-marca-preto font-semibold text-marca-preto"
                : "border-transparent text-marca-cinza-600 hover:text-marca-preto"
            }`}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
