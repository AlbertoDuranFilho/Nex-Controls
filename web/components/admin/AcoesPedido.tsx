"use client";

import { useAcao } from "@/lib/react/destravar-transicao";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { STATUS_PEDIDO, opcoesDeStatus, type PedidoStatus } from "@/lib/pedidos/transicoes";
import { atualizarPedido, reenviarEmails } from "@/services/pedidos-admin";

type Props = {
  pedidoId: string;
  numero: number;
  status: PedidoStatus;
  notaId: string | null;
  notaUrl: string | null;
  notificado: boolean;
};

const campo =
  "mt-1 block w-full border border-marca-cinza-200 bg-marca-branco px-3 py-2 text-sm text-marca-preto focus:border-marca-preto focus:outline-none";

export default function AcoesPedido({ pedidoId, numero, status, notaId, notaUrl, notificado }: Props) {
  const [estado, salvar, salvando] = useAcao<ResultadoAdmin | null, FormData>(atualizarPedido, null);
  const [envio, reenviar, enviando] = useAcao<ResultadoAdmin | null, FormData>(
    async () => reenviarEmails(numero),
    null,
  );

  return (
    <div className="space-y-6">
      <form action={salvar} className="space-y-4">
        <input type="hidden" name="pedido_id" value={pedidoId} />
        <div className="text-sm font-medium text-marca-preto">
          <label htmlFor="pedido-status" className="block">Status</label>
          <select key={status} id="pedido-status" name="status" defaultValue={status} className={campo}>
            {opcoesDeStatus(status).map((s) => (
              <option key={s} value={s}>
                {STATUS_PEDIDO[s]}
              </option>
            ))}
          </select>
        </div>
        <label className="block text-sm font-medium text-marca-preto">
          Número da nota
          <input name="nota_id" defaultValue={notaId ?? ""} maxLength={100} className={campo} />
        </label>
        <label className="block text-sm font-medium text-marca-preto">
          Link da nota
          <input
            name="nota_url"
            type="text"
            inputMode="url"
            defaultValue={notaUrl ?? ""}
            maxLength={500}
            placeholder="https://"
            className={campo}
          />
        </label>
        <button
          type="submit"
          disabled={salvando}
          className="bg-marca-preto px-4 py-2 text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:bg-marca-cinza-400"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {estado ? (
          <p role={estado.ok ? "status" : "alert"} className="text-sm text-marca-preto">
            {estado.ok ? "Pedido atualizado." : estado.erro}
          </p>
        ) : null}
      </form>

      <form action={reenviar} className="space-y-2 border-t border-marca-cinza-200 pt-4">
        <p className="text-sm text-marca-cinza-600">
          E-mails do pedido: {notificado ? "enviados" : "pendentes (falha no envio)"}.
        </p>
        <button
          type="submit"
          disabled={enviando}
          className="border border-marca-preto px-4 py-2 text-sm font-semibold text-marca-preto transition-colors hover:bg-marca-cinza-50 disabled:text-marca-cinza-400"
        >
          {enviando ? "Enviando…" : "Reenviar e-mails"}
        </button>
        {envio ? (
          <p role={envio.ok ? "status" : "alert"} className="text-sm text-marca-preto">
            {envio.ok ? "E-mails enviados." : envio.erro}
          </p>
        ) : null}
      </form>
    </div>
  );
}
