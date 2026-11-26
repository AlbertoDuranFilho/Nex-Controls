import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

// Estilo único dos campos da área do cliente (rounded-xl, foco visível).
export const classeCampo =
  "block w-full h-12 rounded-xl border border-marca-cinza-200 bg-marca-branco px-4 text-[15px] text-marca-preto " +
  "placeholder:text-marca-cinza-400 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition duration-200 motion-reduce:transition-none " +
  "hover:border-marca-cinza-300 focus:border-marca-preto focus:outline-none focus:ring-4 focus:ring-marca-preto/5 " +
  "disabled:cursor-not-allowed disabled:bg-marca-cinza-50 disabled:text-marca-cinza-500 " +
  "aria-invalid:border-marca-preto aria-invalid:ring-4 aria-invalid:ring-marca-preto/10";

export type CampoProps = {
  icone?: LucideIcon;
  /** Conteúdo à direita, dentro do campo (ex.: botão de mostrar senha). */
  acessorio?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Campo({ icone: Icone, acessorio, className = "", ...resto }: CampoProps) {
  return (
    <div className="group relative">
      {Icone && (
        <Icone
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-marca-cinza-400 transition-colors group-focus-within:text-marca-preto"
        />
      )}
      <input
        className={`${classeCampo} ${Icone ? "pl-11" : ""} ${acessorio ? "pr-12" : ""} ${className}`.trim()}
        {...resto}
      />
      {acessorio && <div className="absolute inset-y-0 right-1.5 flex items-center">{acessorio}</div>}
    </div>
  );
}
