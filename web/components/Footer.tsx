
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function Footer({locale} : { locale: string}) {
  const t = useTranslations('footer')
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-gray-900 text-white bottom-0 py-8 text-center" >
      <div className="max-w-4xl mx-auto">
        <p className="mb-2">
          
          © {currentYear} Nex Controls. {t('rights')}.
          <Link
            href={`/${locale}/privacy-policy`}
            className=" hover:text-gray-300 ml-1"
          >
            {t("privacyLink")}
          </Link>
        </p>
        <p className="text-gray-400 text-sm">{t('tagline')}</p>
      </div>
    </footer>
  )
}