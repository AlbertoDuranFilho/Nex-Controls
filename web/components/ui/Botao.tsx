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
  /** Só com `href` (ex.: manual em nova aba). */
  target?: string;
  rel?: string;
  /** Rótulo pode quebrar em mais de uma linha (espaço estreito, ex.: cartão no celular). */
  multilinha?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold select-none " +
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

// Multilinha: altura mínima no lugar da fixa e texto centralizado que quebra.
const tamanhosMultilinha: Record<Tamanho, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm leading-tight",
  md: "min-h-11 px-5 py-2 text-sm leading-tight",
  lg: "min-h-13 px-6 py-2.5 text-base leading-tight",
};

const icones: Record<Tamanho, string> = { sm: "size-4", md: "size-4", lg: "size-5" };

export function classesBotao(
  variante: Variante = "primario",
  tamanho: Tamanho = "md",
  extra = "",
  multilinha = false,
) {
  const medida = multilinha ? `${tamanhosMultilinha[tamanho]} text-center` : `${tamanhos[tamanho]} whitespace-nowrap`;
  return `${base} ${variantes[variante]} ${medida} ${extra}`.trim();
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
  target,
  rel,
  multilinha = false,
  ...resto
}: BotaoProps) {
  const classes = classesBotao(variante, tamanho, className, multilinha);
  const conteudo = (
    <>
      {carregando ? (
        <LoaderCircle aria-hidden className={`${icones[tamanho]} shrink-0 animate-spin motion-reduce:animate-none`} />
      ) : (
        Icone && <Icone aria-hidden className={`${icones[tamanho]} shrink-0`} />
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
        target={target}
        rel={rel}
        aria-current={resto["aria-current"]}
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
