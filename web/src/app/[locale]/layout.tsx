import type { Metadata } from "next"
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { routing } from '../../i18n/routing'
import "../globals.css"
import Footer from "@/components/Footer"
import CookieConsent from "@/components/CookieConsent"
import Navbar from "@/components/Navbar"
import OcultarNoAdmin from "@/components/OcultarNoAdmin"
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "Nex Controls - Placas e Equipamentos",
  description: "Inteligência Global, Controle de Qualidade."
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
 
}

// Locale conhecido em tempo de build: permite páginas estáticas/ISR (catálogo).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({ children, params }: Props) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const messages = await getMessages({ locale })

  return (
    <html lang={locale}>
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          <main className="flex-grow">
            {children}
            <Analytics />
          </main>
          {/* Aviso de cookies é para o visitante do site; no painel ele cobria os botões do fim da página. */}
          <OcultarNoAdmin>
            <CookieConsent />
          </OcultarNoAdmin>
        </NextIntlClientProvider>
        <OcultarNoAdmin>
          <Footer locale={locale} />
        </OcultarNoAdmin>
      </body>
    </html>
  )
}