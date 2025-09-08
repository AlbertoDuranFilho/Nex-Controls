import { useTranslations } from 'next-intl'

export default function Footer() {
  const t = useTranslations('footer')
  const currentYear = 2025
  
  return (
    <footer className="bg-gray-900 text-white bottom-0 py-8 text-center">
      <div className="max-w-4xl mx-auto">
        <p className="mb-2">© {currentYear} Nex Controls. {t('rights')}.</p>
        <p className="text-gray-400 text-sm">{t('tagline')}</p>
      </div>
    </footer>
  )
}