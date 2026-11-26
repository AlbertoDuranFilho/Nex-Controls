import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type Passo = { rotulo: string; href?: string };

/** Breadcrumb: o primeiro passo leva o ícone de casa; o último é a página atual. */
export default function Trilha({ rotulo, passos }: { rotulo: string; passos: Passo[] }) {
  return (
    <nav aria-label={rotulo}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-marca-cinza-500">
        {passos.map((p, i) => {
          const ultimo = i === passos.length - 1;
          const conteudo = (
            <>
              {i === 0 && <Home aria-hidden className="size-4" />}
              <span className={ultimo ? "line-clamp-1" : ""}>{p.rotulo}</span>
            </>
          );
          return (
            <li key={`${i}-${p.rotulo}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-marca-cinza-400" />}
              {ultimo || !p.href ? (
                <span aria-current={ultimo ? "page" : undefined} className="flex min-w-0 items-center gap-1.5 font-medium text-marca-preto">
                  {conteudo}
                </span>
              ) : (
                <Link
                  href={p.href}
                  className="flex items-center gap-1.5 rounded transition-colors hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
                >
                  {conteudo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
