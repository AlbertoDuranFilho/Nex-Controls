
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function Footer({locale} : { locale?: string}) {
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
        <address className="not-italic text-marca-cinza-400 text-xs mt-4 space-y-1">
          <p>{t('company')} · {t('cnpj')}</p>
          <p>{t('address')}</p>
          <p>
            {t('contact')}:{' '}
            <a href="mailto:contato@nexcontrols.com" className="hover:text-marca-cinza-300">
              contato@nexcontrols.com
            </a>
          </p>
        </address>
      </div>
    </footer>
  )
}
