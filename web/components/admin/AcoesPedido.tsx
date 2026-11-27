"use client";

import { useAcao } from "@/lib/react/destravar-transicao";
import { Mail, Save } from "lucide-react";
import { AvisoAdmin } from "@/components/admin/CamposAdmin";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import Botao from "@/components/ui/Botao";
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
        <div>
          <label htmlFor="pedido-status" className={estiloRotulo}>
            Status
          </label>
          <select key={status} id="pedido-status" name="status" defaultValue={status} className={estiloCampo}>
            {opcoesDeStatus(status).map((s) => (
              <option key={s} value={s}>
                {STATUS_PEDIDO[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pedido-nota-id" className={estiloRotulo}>
            Número da nota
          </label>
          <input
            id="pedido-nota-id"
            name="nota_id"
            defaultValue={notaId ?? ""}
            maxLength={100}
            placeholder="Ex.: 000123"
            className={estiloCampo}
          />
        </div>
        <div>
          <label htmlFor="pedido-nota-url" className={estiloRotulo}>
            Link da nota
          </label>
          <input
            id="pedido-nota-url"
            name="nota_url"
            type="text"
            inputMode="url"
            defaultValue={notaUrl ?? ""}
            maxLength={500}
            placeholder="https://"
            className={estiloCampo}
          />
        </div>
        <Botao type="submit" carregando={salvando} icone={Save} className="w-full">
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        {estado ? (
          <AvisoAdmin tipo={estado.ok ? "ok" : "erro"} papel={estado.ok ? "status" : "alert"}>
            {estado.ok ? "Pedido atualizado." : estado.erro}
          </AvisoAdmin>
        ) : null}
      </form>

      <form action={reenviar} className="space-y-3 border-t border-marca-cinza-100 pt-5">
        <p className="text-sm text-marca-cinza-600">
          E-mails do pedido: {notificado ? "enviados" : "pendentes (falha no envio)"}.
        </p>
        <Botao type="submit" variante="secundario" carregando={enviando} icone={Mail} className="w-full">
          {enviando ? "Enviando…" : "Reenviar e-mails"}
        </Botao>
        {envio ? (
          <AvisoAdmin tipo={envio.ok ? "ok" : "erro"} papel={envio.ok ? "status" : "alert"}>
            {envio.ok ? "E-mails enviados." : envio.erro}
          </AvisoAdmin>
        ) : null}
      </form>
    </div>
  );
}
