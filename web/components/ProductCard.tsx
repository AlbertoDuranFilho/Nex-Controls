import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Produto } from "@/types/Produto";

interface ProductCardProps {
  produto: Produto; 
}

export default function ProductCard({ produto }: ProductCardProps) {
  const t = useTranslations("catalog");
  const img = produto.imagens?.[0]?.url ?? "/placeholder.png";

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow hover:border hover:border-blue-700 ">
      <div className="relative w-full h-48 flex items-center justify-center p-4">
        {img ? (
          <Image
            src={`${API_URL}${img}`}
            alt={produto.nome}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm" />
        )}
      </div>
      {/* Conteúdo */}
      <div className="flex flex-col items-center flex-grow text-center px-4 pb-4">
        <h3 className="text-white font-bold text-lg rounded-md w-44 bg-blue-800 ">{produto.codigo}</h3>
        <p className="text-sm text-gray-700 mt-1 flex-grow">
          {produto.nome}
        </p>
      </div>

        {/* Botão */}
        <Link
          href={`/catalogo/${produto.documentId}`}
          className="block text-center bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold py-2 rounded-b-md"
        >
          {t("learnMore")} →
        </Link>
      </div>
   
  );
}