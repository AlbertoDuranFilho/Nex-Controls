import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type EventoLinhaDoTempo = {
  id: string;
  titulo: string;
  /** ISO, para o <time dateTime>. */
  quando: string;
  /** Data já formatada no idioma da página. */
  quandoTexto: string;
  icone: LucideIcon;
  /** Complemento depois da data (ex.: "Pago → Faturado por Admin"). */
  detalhe?: ReactNode;
};

// Linha do tempo do pedido (mais antigo primeiro; o último fica em destaque). Área do cliente e admin.
export default function LinhaDoTempo({ eventos, testId }: { eventos: EventoLinhaDoTempo[]; testId?: string }) {
  return (
    <ol className="relative" data-testid={testId}>
      {eventos.map((e, idx) => {
        const ultimo = idx === eventos.length - 1;
        const Icone = e.icone;
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!ultimo && <span aria-hidden="true" className="absolute top-10 bottom-0 left-[19px] w-px bg-marca-cinza-200" />}
            <span
              className={`relative grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-marca-branco ${
                ultimo ? "bg-marca-preto text-marca-branco" : "bg-marca-cinza-100 text-marca-cinza-700"
              }`}
            >
              <Icone aria-hidden className="size-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-1">
              <p className={`text-sm font-semibold ${ultimo ? "text-marca-preto" : "text-marca-cinza-800"}`}>{e.titulo}</p>
              <p className="mt-0.5 text-xs break-words text-marca-cinza-500">
                <time dateTime={e.quando}>{e.quandoTexto}</time>
                {e.detalhe ? <> · {e.detalhe}</> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
