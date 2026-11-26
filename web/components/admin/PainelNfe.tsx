"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import {
  cancelarNfeMaino,
  emitirNfeMaino,
  enviarPedidoMaino,
  sincronizarNfeMaino,
} from "@/services/nfe-admin";
import type { SituacaoNfe } from "@/services/nfe-sincronizar";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

type Props = {
  pedidoId: string;
  status: PedidoStatus;
  mainoPedidoId: string | null;
  nfeStatus: string | null;
  nfeErro: string | null;
  danfeUrl: string | null;
  chave: string | null;
};

const ROTULO: Record<string, string> = {
  NAO_TRANSMITIDA: "Aguardando transmissão",
  EM_TRANSMISSAO: "Em transmissão",
  ACEITA: "Autorizada",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
  DENEGADA: "Denegada",
};

const botao =
  "border border-marca-preto px-4 py-2 text-sm font-semibold text-marca-preto transition-colors hover:bg-marca-cinza-50 disabled:border-marca-cinza-200 disabled:text-marca-cinza-400";

export default function PainelNfe({ pedidoId, status, mainoPedidoId, nfeStatus, nfeErro, danfeUrl, chave }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);

  function executar(acao: (id: string) => Promise<ResultadoAdmin<SituacaoNfe>>, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    setMensagem(null);
    iniciar(async () => {
      try {
        const r = await acao(pedidoId);
        if (!r.ok) setMensagem({ ok: false, texto: r.erro });
        else if (r.dados.nfe_status !== nfeStatus || r.dados.maino_pedido_id !== mainoPedidoId) {
          setMensagem({ ok: true, texto: "Situação atualizada." });
        } else setMensagem({ ok: true, texto: "Sem mudanças." });
      } catch {
        setMensagem({ ok: false, texto: "Não foi possível concluir a operação. Tente novamente." });
      }
      router.refresh();
    });
  }

  const enviar = status === "pago" && !mainoPedidoId;
  const emitir = status === "pago" && !!mainoPedidoId && (!nfeStatus || nfeStatus === "REJEITADA");
  // ACEITA sem DANFE também: a Mainô pode gerar o PDF depois da autorização.
  const atualizar =
    !!mainoPedidoId &&
    (nfeStatus === "NAO_TRANSMITIDA" || nfeStatus === "EM_TRANSMISSAO" || (nfeStatus === "ACEITA" && !danfeUrl));
  const cancelar = !!mainoPedidoId && nfeStatus === "ACEITA";

  const situacao = nfeStatus
    ? (ROTULO[nfeStatus] ?? nfeStatus)
    : mainoPedidoId
      ? "Pedido enviado, nota não emitida"
      : "Não enviado à Mainô";

  return (
    <div className="max-w-md space-y-3 text-sm text-marca-cinza-800">
      <p>
        Situação:{" "}
        <span data-testid="nfe-status" className="font-medium text-marca-preto">
          {situacao}
        </span>
      </p>
      {nfeErro ? (
        <p role="alert" className="text-marca-preto">
          Erro da Mainô: {nfeErro}
        </p>
      ) : null}
      {danfeUrl ? (
        <p>
          <a href={danfeUrl} target="_blank" rel="noopener noreferrer" className="text-marca-preto underline underline-offset-2">
            {nfeStatus === "CANCELADA" ? "DANFE (PDF, nota cancelada)" : "DANFE (PDF)"}
          </a>
        </p>
      ) : null}
      {chave ? <p className="break-all">Chave de acesso: {chave}</p> : null}

      <div className="flex flex-wrap gap-2">
        {enviar ? (
          <button type="button" disabled={pendente} onClick={() => executar(enviarPedidoMaino)} className={botao}>
            {pendente ? "Enviando…" : "Enviar para a Mainô"}
          </button>
        ) : null}
        {emitir ? (
          <button type="button" disabled={pendente} onClick={() => executar(emitirNfeMaino)} className={botao}>
            {pendente ? "Emitindo…" : "Emitir NF-e"}
          </button>
        ) : null}
        {atualizar ? (
          <button type="button" disabled={pendente} onClick={() => executar(sincronizarNfeMaino)} className={botao}>
            {pendente ? "Atualizando…" : "Atualizar situação"}
          </button>
        ) : null}
        {cancelar ? (
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(cancelarNfeMaino, "Cancelar a NF-e deste pedido na Mainô? Essa ação não pode ser desfeita.")}
            className={botao}
          >
            {pendente ? "Cancelando…" : "Cancelar NF-e"}
          </button>
        ) : null}
      </div>
      {mensagem ? (
        <p role={mensagem.ok ? "status" : "alert"} className="text-marca-preto">
          {mensagem.texto}
        </p>
      ) : null}
    </div>
  );
}
