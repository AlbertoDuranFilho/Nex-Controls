import type { Metadata } from "next"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import "../globals.css"
import Footer from "@/components/Footer"
import CookieConsent from "@/components/CookieConsent"
import Navbar from "@/components/Navbar"

export const metadata: Metadata = {
  title: "Nex Controls - Placas e Equipamentos",
  description: "Inteligência Global, Controle de Qualidade."
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
 
}

export default async function RootLayout({ children, params }: Props) {
  const {locale} = await params;
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>

          <Navbar />
          {/* Conteúdo ocupa a tela toda */}
          <main className="flex-grow">
            {children}
          </main>
          <CookieConsent />
        </NextIntlClientProvider>
        <Footer locale={locale} />
      </body>
    </html>
  )
}