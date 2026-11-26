import type { ReactNode } from "react";

// Cabeçalho padrão das páginas do admin: título, subtítulo cinza e ações à direita.
export default function CabecalhoAdmin({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-marca-preto">{titulo}</h1>
        {descricao ? <p className="mt-1 text-sm text-marca-cinza-600">{descricao}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
