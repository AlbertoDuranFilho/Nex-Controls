import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listarProdutosPublicos } from "@/services/catalogo"
import ContactForm from "@/components/ContactForm"
import InfoBanner from "@/components/InfoBanner"
import PromosSection from "@/components/PromosSection"
import CatalogoSection from '@/components/CatalogoSection'

export const revalidate = 3600

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // A home não pode cair por causa do catálogo: sem produtos, mostra o aviso.
  const produtos = await listarProdutosPublicos().catch((e) => {
    console.error("Falha ao carregar o catálogo da home:", e);
    return [];
  });
  const t = await getTranslations();

  return (
    <>
      {/* Home */}
      <section id="home" className="h-[80vh] relative flex items-center justify-center text-center text-white overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0">

          <source src="/videos/bg-video.webm" type="video/webm" />

        </video>

        <div className="absolute inset-0 bg-black opacity-70 z-10"></div>

        <div className="relative z-20 max-w-4xl px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {t('home.headline')}
          </h1>
          <p className="text-lg md:text-xl mb-8">
            {t('home.subtitle')}
          </p>
          <a
            href="#contato"
            className="inline-block bg-blue-700 px-8 py-4 rounded-lg text-white font-semibold hover:bg-blue-800 transition-colors"
          >
            {t('home.cta')}
          </a>
        </div>

        <InfoBanner />

      </section>

      {/* Catálogo */}
      <CatalogoSection produtos={produtos} />

      {/* Banner App */}
      <PromosSection/>

      {/* Contato */}
      <ContactForm />
    </>
  )
}
