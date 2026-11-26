import type { Database } from "@/types/database";

export type PedidoStatus = Database["public"]["Enums"]["pedido_status"];

// Rótulos em português (painel admin). O cliente usa pedidos.status.* nas mensagens.
export const STATUS_PEDIDO: Record<PedidoStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  faturado: "Faturado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  erro_pagamento: "Erro no pagamento",
  devolvido: "Devolvido",
};

export const TODOS_STATUS = Object.keys(STATUS_PEDIDO) as PedidoStatus[];

// Única fonte das transições no TypeScript; o banco (admin_atualizar_pedido) é a autoridade.
const TRANSICOES: Partial<Record<PedidoStatus, PedidoStatus[]>> = {
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["faturado", "cancelado"],
  faturado: ["enviado"],
  enviado: ["entregue"],
  entregue: ["devolvido"],
};

export function transicaoPermitida(de: PedidoStatus, para: PedidoStatus): boolean {
  return TRANSICOES[de]?.includes(para) ?? false;
}

// Status atual primeiro, depois as transições permitidas.
export function opcoesDeStatus(atual: PedidoStatus): PedidoStatus[] {
  return [atual, ...(TRANSICOES[atual] ?? [])];
}

export function ehStatus(valor: string): valor is PedidoStatus {
  return (TODOS_STATUS as string[]).includes(valor);
}
