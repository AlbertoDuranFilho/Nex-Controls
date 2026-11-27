import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Tabela em cartão. Em telas >= md é uma tabela comum; abaixo disso cada linha vira um cartão
// empilhado (o rótulo da coluna vem de `rotulo` em cada célula). Papéis ARIA explícitos mantêm a
// semântica de tabela mesmo com `display: block`.
export function TabelaAdmin({ colunas, children }: { colunas: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-marca-cinza-200 bg-marca-branco shadow-suave">
      <table role="table" className="block w-full text-left text-sm md:table">
        <thead role="rowgroup" className="hidden bg-marca-cinza-50 text-xs text-marca-cinza-600 md:table-header-group">
          <tr role="row">
            {colunas.map((c, i) => (
              <th key={i} role="columnheader" scope="col" className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="block md:table-row-group">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function LinhaAdmin({ children }: { children: ReactNode }) {
  return (
    <tr
      role="row"
      className="block border-t border-marca-cinza-200 p-4 transition-colors first:border-t-0 hover:bg-marca-cinza-50 motion-reduce:transition-none md:table-row md:p-0"
    >
      {children}
    </tr>
  );
}

export function CelulaAdmin({
  rotulo,
  alinhar,
  className = "",
  children,
}: {
  rotulo?: string;
  alinhar?: "direita";
  className?: string;
  children: ReactNode;
}) {
  const direita = alinhar === "direita";
  return (
    <td
      role="cell"
      data-rotulo={rotulo}
      className={`flex items-center gap-4 py-1 md:table-cell md:px-4 md:py-3 ${
        rotulo
          ? "justify-between before:text-xs before:font-medium before:text-marca-cinza-500 before:content-[attr(data-rotulo)] md:before:hidden"
          : ""
      } ${direita ? "md:text-right" : ""} ${className}`.trim()}
    >
      {rotulo ? <span className="min-w-0 text-right md:text-left">{children}</span> : children}
    </td>
  );
}

export function VazioAdmin({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-marca-cinza-200 bg-marca-branco px-6 py-14 text-center shadow-suave">
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-marca-cinza-100 text-marca-cinza-500">
        <Icone className="size-6" strokeWidth={1.5} />
      </span>
      <p className="text-marca-cinza-600">{children}</p>
    </div>
  );
}
