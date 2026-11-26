import Image from "next/image";

// logo.svg é um quadrado 1080×1080 com a marca centrada (≈680×356). A caixa tem a proporção
// da marca e a imagem é ampliada para cortar as margens. `clara` pinta a logo de branco.
export default function LogoNex({
  clara = false,
  className = "",
  alt = "Nex Controls",
}: {
  clara?: boolean;
  className?: string;
  alt?: string;
}) {
  return (
    <span className={`relative block aspect-[680/356] overflow-hidden ${className}`.trim()}>
      <Image
        src="/images/logo.svg"
        alt={alt}
        width={1080}
        height={1080}
        unoptimized
        priority
        className={`absolute top-1/2 left-1/2 h-auto w-[158.9%] max-w-none -translate-x-1/2 -translate-y-1/2 ${
          clara ? "brightness-0 invert" : ""
        }`}
      />
    </span>
  );
}
