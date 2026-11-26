import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Cartão branco da área do cliente (rounded-2xl, sombra suave), com cabeçalho opcional.
export default function CartaoConta({
  titulo,
  descricao,
  icone: Icone,
  idTitulo,
  className = "",
  children,
}: {
  titulo?: string;
  descricao?: ReactNode;
  icone?: LucideIcon;
  /** Id do título, para `aria-labelledby` da seção. */
  idTitulo?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titulo ? idTitulo : undefined}
      className={`rounded-2xl border border-marca-cinza-200 bg-marca-branco p-5 shadow-sm sm:p-7 ${className}`.trim()}
    >
      {titulo && (
        <header className={`mb-6 flex gap-3.5 ${descricao ? "items-start" : "items-center"}`}>
          {Icone && (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-cinza-100 text-marca-preto">
              <Icone aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-base font-semibold text-marca-preto sm:text-lg">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-sm text-marca-cinza-600">{descricao}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

// Título da página da conta: ícone em quadrado preto, título e linha de apoio.
export function CabecalhoConta({
  icone: Icone,
  titulo,
  children,
  acoes,
}: {
  icone: LucideIcon;
  titulo: string;
  children?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-marca-preto text-marca-branco shadow-suave">
          <Icone aria-hidden className="size-5.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-marca-preto sm:text-[28px]">{titulo}</h1>
          {children && <div className="mt-0.5 text-sm text-marca-cinza-600">{children}</div>}
        </div>
      </div>
      {acoes}
    </div>
  );
}
