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
      <div className="relative w-full h-32 flex items-center justify-center p-4 bg-white">
        {img ? (
          <Image
            src={img}
            alt={produto.nome}
            width={160}
            height={120}
            className="object-contain max-h-[100px]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm" />
        )}

        {/* Código do produto como badge */}
        <span className="absolute top-2 left-2 bg-blue-800 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10">
          {produto.codigo}
        </span>
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