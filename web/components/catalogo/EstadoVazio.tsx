import { PackageSearch } from "lucide-react";
import type { ReactNode } from "react";

export default function EstadoVazio({
  titulo,
  dica,
  children,
}: {
  titulo: string;
  dica?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-marca-cinza-300 bg-marca-cinza-50 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-marca-branco shadow-suave ring-1 ring-marca-cinza-200">
        <PackageSearch aria-hidden className="size-6 text-marca-preto" strokeWidth={1.5} />
      </span>
      <p className="mt-5 text-base font-semibold text-marca-preto">{titulo}</p>
      {dica && <p className="mt-1 max-w-sm text-sm text-marca-cinza-500">{dica}</p>}
      {children}
    </div>
  );
}
