"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, MapPin, Package, ShieldCheck, ShoppingCart, User } from "lucide-react";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Lateral no desktop, abas rolaveis no mobile. "Seguranca" so existe com a flag ligada;
// o valor vem de um Server Component porque a flag e env so de servidor.
export default function NavConta({
  locale,
  trocaSenha,
  nome,
}: {
  locale: string;
  trocaSenha: boolean;
  nome: string;
}) {
  const t = useTranslations("conta.nav");
  const pathname = usePathname();
  const base = `/${locale}/cliente`;
  const itens = [
    { href: `/${locale}/catalogo`, rotulo: t("catalogo"), icone: LayoutGrid },
    { href: `${base}/carrinho`, rotulo: t("carrinho"), icone: ShoppingCart },
    { href: `${base}/pedidos`, rotulo: t("pedidos"), icone: Package, prefixo: true },
    { href: base, rotulo: t("meusDados"), icone: User },
    { href: `${base}/endereco`, rotulo: t("endereco"), icone: MapPin },
    ...(trocaSenha ? [{ href: `${base}/seguranca`, rotulo: t("seguranca"), icone: ShieldCheck }] : []),
  ];

  return (
    <aside className="md:sticky md:top-28 md:w-64 md:shrink-0">
      <div className="hidden items-center gap-3 px-2 pb-5 md:flex">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-marca-preto text-sm font-semibold tracking-wide text-marca-branco"
        >
          {iniciais(nome) || <User className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wider text-marca-cinza-500 uppercase">{t("area")}</p>
          <p className="truncate text-sm font-semibold text-marca-preto" title={nome}>
            {nome}
          </p>
        </div>
      </div>
      <nav
        aria-label={t("aria")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:rounded-2xl md:border md:border-marca-cinza-200 md:bg-marca-branco md:p-2 md:shadow-sm"
      >
        {itens.map(({ href, rotulo, icone: Icone, prefixo }) => {
          const ativo = pathname === href || (!!prefixo && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition duration-200 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none md:px-3 ${
                ativo
                  ? "bg-marca-preto font-semibold text-marca-branco shadow-suave"
                  : "border border-marca-cinza-200 bg-marca-branco font-medium text-marca-cinza-700 hover:border-marca-cinza-300 hover:text-marca-preto md:border-transparent md:hover:bg-marca-cinza-100"
              }`}
            >
              <Icone
                aria-hidden
                className={`size-[18px] shrink-0 ${ativo ? "" : "text-marca-cinza-500 group-hover:text-marca-preto"}`}
                strokeWidth={1.75}
              />
              {rotulo}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
