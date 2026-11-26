import Link from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma";
type Tamanho = "sm" | "md" | "lg";

export type BotaoProps = {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
  href?: string;
  carregando?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none " +
  "transition duration-200 active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-60";

const variantes: Record<Variante, string> = {
  primario: "bg-marca-preto text-marca-branco shadow-suave hover:bg-marca-cinza-800 hover:shadow-elevada",
  secundario:
    "border border-marca-cinza-300 bg-marca-branco text-marca-preto hover:border-marca-preto hover:bg-marca-cinza-50",
  fantasma: "text-marca-cinza-700 hover:bg-marca-cinza-100 hover:text-marca-preto",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

const icones: Record<Tamanho, string> = { sm: "size-4", md: "size-4", lg: "size-5" };

export function classesBotao(variante: Variante = "primario", tamanho: Tamanho = "md", extra = "") {
  return `${base} ${variantes[variante]} ${tamanhos[tamanho]} ${extra}`.trim();
}

export default function Botao({
  variante = "primario",
  tamanho = "md",
  icone: Icone,
  href,
  carregando = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...resto
}: BotaoProps) {
  const classes = classesBotao(variante, tamanho, className);
  const conteudo = (
    <>
      {carregando ? (
        <LoaderCircle aria-hidden className={`${icones[tamanho]} animate-spin motion-reduce:animate-none`} />
      ) : (
        Icone && <Icone aria-hidden className={icones[tamanho]} />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={resto["aria-label"]}
        title={resto.title}
        id={resto.id}
      >
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {conteudo}
    </button>
  );
}
