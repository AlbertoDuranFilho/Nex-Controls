import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type TomSelo = "neutro" | "escuro" | "ambar" | "azul" | "violeta" | "ciano" | "verde" | "vermelho";

// Tons suaves com texto escuro do mesmo matiz (contraste AA sobre o fundo claro).
const tons: Record<TomSelo, string> = {
  neutro: "bg-marca-cinza-100 text-marca-cinza-700 ring-marca-cinza-200",
  escuro: "bg-marca-preto text-marca-branco ring-marca-preto",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200",
  azul: "bg-blue-50 text-blue-800 ring-blue-200",
  violeta: "bg-violet-50 text-violet-800 ring-violet-200",
  ciano: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  vermelho: "bg-red-50 text-red-800 ring-red-200",
};

export default function Selo({
  tom = "neutro",
  icone: Icone,
  className = "",
  children,
  ...resto
}: {
  tom?: TomSelo;
  icone?: LucideIcon;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tons[tom]} ${className}`.trim()}
      {...resto}
    >
      {Icone && <Icone aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
