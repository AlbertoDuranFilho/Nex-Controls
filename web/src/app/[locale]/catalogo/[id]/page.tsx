import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ProdutoDetalhe from "@/components/ProdutoDetalhe"
import { getTranslations } from 'next-intl/server'
import Link from "next/link"
import { getProduto } from "@/services/strapi"


export default async function ProdutoPage({ params }: { params: { id: string } }) {
  const produto = await getProduto(params.id);
  
  const t = await getTranslations("product");
  
  if (!produto) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center ">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('notFound')}</h1>
            <Link href="/#catalogo" className="text-red-600 hover:underline">← {t('backToCatalog')}</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <ProdutoDetalhe produto={produto} />
      </div>
    </>
  )
}