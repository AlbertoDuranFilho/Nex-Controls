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

  return (
    <div className="flex flex-col h-full bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow hover:border hover:border-blue-700 ">
      <div className="relative w-full h-32 flex items-center justify-center p-4">
        {img ? (
          <Image
            src={`${img}`}
            alt={produto.nome}
            width={160}
            height={120}
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm" />
        )}

        <h3 className="absolute z-10 text-white font-bold text-lg rounded-md w-44 bg-blue-800 ">{produto.codigo}</h3>
      </div>
      {/* Conteúdo */}
      <div className="flex flex-col items-center flex-grow text-center px-4 pb-4">
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