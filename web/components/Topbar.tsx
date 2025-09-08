"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from 'next-intl'
import LanguageSwitcher from "./LanguageSwitcher"

export default function Topbar() {
  const pathname = usePathname()
  const t = useTranslations('topbar')

  // Detecta idioma atual da URL
  const currentLocale = pathname.split('/')[1] || 'pt'

  return (
    <div className="w-full bg-gray-900 text-gray-100 text-sm px-6 py-2 flex justify-between items-center fixed top-0 z-50">
      <div className="flex gap-6">
        <a href={`mailto:${t('email')}`} className="hover:text-red-400">
          📧 {t('email')}
        </a>
        <a href={`tel:${t('phone')}`} className="hover:text-red-400">
          📞 {t('phone')}
        </a>
      </div>

      <div className="flex gap-6 items-center">
        <a href={`/${currentLocale}/cliente/login`} className="hover:text-red-400">
          🔑 {t('clientArea')}
        </a>

        <LanguageSwitcher />
      </div>
    </div>
  )
}