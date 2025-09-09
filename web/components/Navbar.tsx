"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { usePathname, useRouter } from "next/navigation";


const langs = [
  { code: "pt", name: "Português", flag: "/flags/br.png" },
  { code: "en", name: "English", flag: "/flags/us.png" },
  { code: "es", name: "Español", flag: "/flags/es.png" }
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname()
  const t = useTranslations("navbar");

  const currentLocale = pathname.split('/')[1] || 'pt'

   // estado dropdown SAC
  const [openSAC, setOpenSAC] = useState(false);

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

  const handleChange = (lang: string) => {
    const segments = pathname.split("/");
    segments[1] = lang;
    router.push(segments.join("/") || "/");
  };
 

  return (
    <nav className="w-full fixed top-0 left-0 z-50 shadow-md bg-white py-2">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        {/* LOGO maior */}
        <Link href={"/"}>
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="Nex Controls"
              width={160} // 
              height={60}
              className="object-contain"
              />
          </div>
        </Link>

        {/* LINKS centrais */}
        <ul className="hidden md:flex items-center gap-8 text-gray-700 font-medium">
          <li><Link href="/">{t("home")}</Link></li>
          <li><Link href="/#catalogo">{t("catalog")}</Link></li>
          <li><Link href="/#contato">{t("contact")}</Link></li>
        </ul>

        {/* UTILITÁRIOS à direita */}
        <div className=" hidden md:flex items-center gap-4">
          {/* Button SAC com dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenSAC(!openSAC)}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
            >
              SAC
            </button>

            {openSAC && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-12 w-56 bg-white border rounded shadow-md p-3 z-50"
                
              >
                <p className="text-sm font-semibold mb-2">Atendimento</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>{t('email')}</li>
                  {/* <li>💬 WhatsApp: {t('phone')}</li> */}
                </ul>
              </div>
            )}
          </div>

          {/* Select Idioma */}
          <LanguageSwitcher />

          {/* Botão área do cliente */}
          <Link
            href={`/${currentLocale}/cliente/login`}
            className="border px-3 py-1.5 rounded-md font-medium hover:bg-gray-100 text-sm text-gray-800 transition-colors"
          >
            {t('clientArea')}
          </Link>
        </div>
      

      {/* Botão Hamburguer Mobile */}
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden p-2 rounded focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Drawer Mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div
            className="absolute top-0 left-0 h-full w-full bg-white shadow-lg p-6 flex flex-col gap-4"
            onClick={closeMenu}
          />

            {/* Drawer animado */}
            <div
              className={`absolute top-0 right-0 h-full w-full bg-white shadow-lg p-6 flex flex-col 
                ${closing ? "animate-slideOutRight" : "animate-slideInRight"}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fechar */}
              <button onClick={closeMenu} className="self-end text-gray-600 mb-6">
                ✕
              </button>

            {/* Links */}
            <nav className="flex flex-col gap-4 text-gray-800 text-base font-medium">
              <Link href="/" onClick={() => setMenuOpen(false)}>{t("home")}</Link>
              <Link href="/#catalogo" onClick={() => setMenuOpen(false)}>{t("catalog")}</Link>
              <Link href="/#contato" onClick={() => setMenuOpen(false)}>{t("contact")}</Link>
            </nav>

            {/* SAC */}
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-semibold mb-2">SAC</p>
              <p className="text-sm">{t("email")}</p>
              {/* <p className="text-sm">💬 WhatsApp: {t('phone')}</p> */}
            </div>

            {/* Idiomas */}
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Idioma</p>
              <div className="flex flex-col gap-2">
                {langs.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleChange(lang.code)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 transition ${
                      lang.code === currentLocale ? "font-semibold text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <Image src={lang.flag} alt={lang.name} width={18} height={18} />
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Área do Cliente */}
            <Link
              href={`/${currentLocale}/cliente/login`}
              onClick={() => setMenuOpen(false)}
              className="mt-4 border px-3 py-2 rounded-md font-medium hover:bg-gray-100 text-sm text-center"
            >
              {t("clientArea")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}