"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname()
  const t = useTranslations("navbar");

  const currentLocale = pathname.split('/')[1] || 'pt'

  // estado dropdown SAC
  const [openSAC, setOpenSAC] = useState(false);

  return (
    <nav className="w-full fixed top-0 left-0 z-50 shadow-md bg-white py-2">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        {/* LOGO maior */}
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Nex Controls"
            width={160} // 
            height={60}
            className="object-contain"
          />
        </div>

        {/* LINKS centrais */}
        <ul className="hidden md:flex items-center gap-8 text-gray-700 font-medium">
          <li><Link href="/">{t("home")}</Link></li>
          <li><Link href="/#catalogo">{t("catalog")}</Link></li>
          <li><Link href="/#contato">{t("contact")}</Link></li>
        </ul>

        {/* UTILITÁRIOS à direita */}
        <div className="flex items-center gap-4">
          {/* Button SAC com dropdown */}
          <div className="relative">
            <button
              onMouseEnter={() => setOpenSAC(true)}
              onMouseLeave={() => setOpenSAC(false)}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
            >
              SAC
            </button>

            {openSAC && (
              <div
                className="absolute right-0 top-12 w-56 bg-white border rounded shadow-md p-3 z-50"
                onMouseEnter={() => setOpenSAC(true)}
                onMouseLeave={() => setOpenSAC(false)}
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
          <Link href={`/${currentLocale}/cliente/login`} className="border px-4 py-2 rounded font-semibold hover:bg-gray-100 text-sm">
           {t('clientArea')}
          </Link>
        </div>
      </div>
    </nav>
  );
}