"use client";

import { useState } from "react";
import { useTransicao } from "@/lib/react/destravar-transicao";
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
import { Ban, FileDown, RefreshCw, Send, Stamp } from "lucide-react";
import { AvisoAdmin } from "@/components/admin/CamposAdmin";
import Botao from "@/components/ui/Botao";
import Selo, { type TomSelo } from "@/components/ui/Selo";

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

const TOM: Record<string, TomSelo> = {
  NAO_TRANSMITIDA: "ambar",
  EM_TRANSMISSAO: "azul",
  ACEITA: "verde",
  REJEITADA: "vermelho",
  CANCELADA: "neutro",
  DENEGADA: "vermelho",
};

export default function PainelNfe({ pedidoId, status, mainoPedidoId, nfeStatus, nfeErro, danfeUrl, chave }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransicao();
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
    <div className="space-y-4 text-sm text-marca-cinza-800">
      <p className="flex flex-wrap items-center gap-2">
        Situação:{" "}
        <Selo tom={nfeStatus ? (TOM[nfeStatus] ?? "neutro") : "neutro"}>
          <span data-testid="nfe-status">{situacao}</span>
        </Selo>
      </p>
      {nfeErro ? (
        <AvisoAdmin tipo="erro">Erro da Mainô: {nfeErro}</AvisoAdmin>
      ) : null}
      {danfeUrl ? (
        <a
          href={danfeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-marca-cinza-300 bg-marca-branco px-4 text-sm font-semibold text-marca-preto transition duration-200 hover:border-marca-preto hover:bg-marca-cinza-50 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
        >
          <FileDown aria-hidden className="size-4" />
          {nfeStatus === "CANCELADA" ? "DANFE (PDF, nota cancelada)" : "DANFE (PDF)"}
        </a>
      ) : null}
      {chave ? (
        <p className="rounded-xl bg-marca-cinza-50 px-3.5 py-3 font-mono text-xs break-all text-marca-cinza-700">
          <span className="font-sans text-sm font-medium text-marca-preto">Chave de acesso:</span> {chave}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {enviar ? (
          <Botao icone={Send} carregando={pendente} onClick={() => executar(enviarPedidoMaino)}>
            {pendente ? "Enviando…" : "Enviar para a Mainô"}
          </Botao>
        ) : null}
        {emitir ? (
          <Botao icone={Stamp} carregando={pendente} onClick={() => executar(emitirNfeMaino)}>
            {pendente ? "Emitindo…" : "Emitir NF-e"}
          </Botao>
        ) : null}
        {atualizar ? (
          <Botao variante="secundario" icone={RefreshCw} carregando={pendente} onClick={() => executar(sincronizarNfeMaino)}>
            {pendente ? "Atualizando…" : "Atualizar situação"}
          </Botao>
        ) : null}
        {cancelar ? (
          <Botao
            variante="secundario"
            icone={Ban}
            carregando={pendente}
            onClick={() => executar(cancelarNfeMaino, "Cancelar a NF-e deste pedido na Mainô? Essa ação não pode ser desfeita.")}
          >
            {pendente ? "Cancelando…" : "Cancelar NF-e"}
          </Botao>
        ) : null}
      </div>
      {mensagem ? (
        <AvisoAdmin tipo={mensagem.ok ? "ok" : "erro"} papel={mensagem.ok ? "status" : "alert"}>
          {mensagem.texto}
        </AvisoAdmin>
      ) : null}
    </div>
  );
}
