import { getTranslations } from 'next-intl/server'
import { getProdutos } from "@/services/strapi"
import Navbar from "@/components/Navbar"
import ProductCard from "@/components/ProductCard"
import ContactForm from "@/components/ContactForm"
import InfoBanner from "@/components/InfoBanner"
import PromosSection from "@/components/PromosSection"

export default async function HomePage() {
  const produtos = await getProdutos();
  const t = await getTranslations();

  return (
    <>
      <Navbar />

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
      <section id="catalogo" className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">{t('catalog.title')}</h2>
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {produtos.map(prod => (
            <ProductCard key={prod.id} produto={prod} />
          ))}
        </div>
      </section>

      {/* Banner App */}
      <PromosSection/>

      {/* Contato */}
      <ContactForm />
    </>
  )
}