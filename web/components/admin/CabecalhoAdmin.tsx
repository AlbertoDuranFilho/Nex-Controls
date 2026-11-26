import type { ReactNode } from "react";

// Cabeçalho padrão das páginas do admin: título, subtítulo cinza e ações à direita.
export default function CabecalhoAdmin({
  titulo,
  descricao,
  children,
  className = "mb-6",
}: {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
  /** Margem de baixo; em páginas com `space-y-*` passe "". */
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words text-marca-preto">{titulo}</h1>
        {descricao ? <p className="mt-1 text-sm break-words text-marca-cinza-600">{descricao}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
