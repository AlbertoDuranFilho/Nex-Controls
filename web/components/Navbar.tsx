"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Check, Headset, House, LayoutGrid, Mail, Menu, MessageSquare, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import MenuUsuario from "./MenuUsuario";
import IconeCarrinho from "./carrinho/IconeCarrinho";
import { usePathname, useRouter } from "next/navigation";
import { ehRotaAdmin } from "@/lib/admin/rota";

const langs = [
  { code: "pt", name: "Português", flag: "/flags/br.png" },
  { code: "en", name: "English", flag: "/flags/us.png" },
  { code: "es", name: "Español", flag: "/flags/es.png" },
];

const linkTopo =
  "rounded-xl px-3.5 py-2 text-[15px] font-medium text-marca-cinza-700 transition-colors duration-150 " +
  "hover:bg-marca-cinza-100 hover:text-marca-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none";

const botaoIcone =
  "grid size-11 shrink-0 place-items-center rounded-xl text-marca-preto transition-colors duration-150 hover:bg-marca-cinza-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const locale = useLocale();

  const currentLocale = pathname.split("/")[1] || "pt";

  // estado dropdown SAC
  const [openSAC, setOpenSAC] = useState(false);
  const sacRef = useRef<HTMLDivElement>(null);

  // estado menu mobile
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  function closeMenu() {
    setClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setClosing(false);
    }, 300); // tempo igual da animação (0.3s)
  }

  // Fecha o drawer ao navegar (inclui o redirect do Sair, feito por Server Action).
  useEffect(() => {
    setMenuOpen(false);
    setOpenSAC(false);
  }, [pathname]);

  // SAC fecha com clique fora ou Esc.
  useEffect(() => {
    if (!openSAC) return;
    const fora = (e: PointerEvent) => {
      if (!sacRef.current?.contains(e.target as Node)) setOpenSAC(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setOpenSAC(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [openSAC]);

  // Drawer: Esc fecha e a página de trás não rola.
  useEffect(() => {
    if (!menuOpen) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  const handleChange = (lang: string) => {
    const segments = pathname.split("/");
    segments[1] = lang;
    router.push(segments.join("/") || "/");
  };

  // O painel admin tem barra lateral própria (depois dos hooks: a ordem deles não pode mudar).
  if (ehRotaAdmin(pathname)) return null;

  const links = [
    { href: `/${locale}`, rotulo: t("home"), icone: House },
    { href: `/${locale}/catalogo`, rotulo: t("catalog"), icone: LayoutGrid },
    { href: `/${locale}#contato`, rotulo: t("contact"), icone: MessageSquare },
  ];

  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-marca-cinza-200/80 bg-marca-branco/95 py-2 shadow-[0_1px_12px_rgb(0_0_0/0.04)] backdrop-blur supports-[backdrop-filter]:bg-marca-branco/85">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* LOGO */}
        <Link
          href={"/"}
          className="shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
        >
          <Image src="/images/logo.png" alt="Nex Controls" width={160} height={60} className="h-auto w-32 object-contain sm:w-40" />
        </Link>

        {/* LINKS centrais */}
        <ul className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={linkTopo}>
                {l.rotulo}
              </Link>
            </li>
          ))}
        </ul>

        {/* UTILITÁRIOS à direita */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {/* SAC com dropdown */}
            <div
              ref={sacRef}
              className="relative"
              // Tab para fora fecha (relatedTarget nulo = clique em área sem foco; o pointerdown cuida).
              onBlur={(e) => {
                const prox = e.relatedTarget;
                if (prox && !e.currentTarget.contains(prox)) setOpenSAC(false);
              }}
            >
              <button
                type="button"
                onClick={() => setOpenSAC(!openSAC)}
                aria-expanded={openSAC}
                className={`flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-marca-preto transition-colors duration-150 hover:bg-marca-cinza-100 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none motion-reduce:transition-none ${
                  openSAC ? "bg-marca-cinza-100" : ""
                }`}
              >
                <Headset aria-hidden className="size-[18px]" strokeWidth={1.75} />
                SAC
              </button>

              {openSAC && (
                <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-4 shadow-elevada">
                  <p className="text-xs font-medium tracking-wider text-marca-cinza-500 uppercase">{t("atendimento")}</p>
                  <a
                    href={`mailto:${t("email")}`}
                    className="mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2 -mx-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-cinza-100"
                  >
                    <Mail aria-hidden className="size-4 text-marca-cinza-500" />
                    {t("email")}
                  </a>
                </div>
              )}
            </div>

            <LanguageSwitcher />
          </div>

          <IconeCarrinho />

          <div className="hidden md:block">
            <MenuUsuario />
          </div>

          {/* Botão Hamburguer Mobile */}
          <button type="button" onClick={() => setMenuOpen(true)} aria-label={t("abrirMenu")} aria-expanded={menuOpen} className={`${botaoIcone} md:hidden`}>
            <Menu aria-hidden className="size-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Drawer Mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 h-dvh md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-marca-preto/40" onClick={closeMenu} />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menuPrincipal")}
            className={`absolute top-0 right-0 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-marca-branco shadow-elevada ${
              closing ? "animate-slideOutRight" : "animate-slideInRight"
            } motion-reduce:animate-none`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-marca-cinza-100 px-5 py-4">
              <Image src="/images/logo.png" alt="Nex Controls" width={160} height={60} className="h-auto w-28 object-contain" />
              <button type="button" onClick={closeMenu} aria-label={t("fecharMenu")} className={botaoIcone}>
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-6 px-5 py-5">
              {/* Área do Cliente */}
              <MenuUsuario onNavegar={() => setMenuOpen(false)} />

              {/* Links */}
              <div className="border-t border-marca-cinza-100 pt-5">
                <ul className="space-y-0.5">
                  {links.map(({ href, rotulo, icone: Icone }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-marca-cinza-700 transition-colors hover:bg-marca-cinza-100 hover:text-marca-preto"
                      >
                        <Icone aria-hidden className="size-[18px] text-marca-cinza-500" strokeWidth={1.75} />
                        {rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SAC */}
              <div className="border-t border-marca-cinza-100 pt-5">
                <p className="px-3 text-xs font-medium tracking-wider text-marca-cinza-500 uppercase">SAC</p>
                <a
                  href={`mailto:${t("email")}`}
                  className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-marca-preto hover:bg-marca-cinza-100"
                >
                  <Mail aria-hidden className="size-[18px] text-marca-cinza-500" strokeWidth={1.75} />
                  {t("email")}
                </a>
              </div>

              {/* Idiomas */}
              <div className="border-t border-marca-cinza-100 pt-5">
                <p className="px-3 text-xs font-medium tracking-wider text-marca-cinza-500 uppercase">{t("idioma")}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {langs.map((lang) => {
                    const atual = lang.code === currentLocale;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleChange(lang.code)}
                        aria-pressed={atual}
                        className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
                          atual
                            ? "border-marca-preto text-marca-preto"
                            : "border-marca-cinza-200 text-marca-cinza-600 hover:border-marca-cinza-300 hover:text-marca-preto"
                        }`}
                      >
                        <Image src={lang.flag} alt="" width={20} height={20} />
                        {lang.name}
                        {atual && <Check aria-hidden className="absolute top-1.5 right-1.5 size-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
