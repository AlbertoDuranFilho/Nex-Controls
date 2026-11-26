import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Clock,
  FileText,
  PackageCheck,
  TriangleAlert,
  Truck,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Selo, { type TomSelo } from "@/components/ui/Selo";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

export const VISUAL_STATUS: Record<PedidoStatus, { tom: TomSelo; icone: LucideIcon }> = {
  aguardando_pagamento: { tom: "ambar", icone: Clock },
  pago: { tom: "azul", icone: BadgeCheck },
  faturado: { tom: "violeta", icone: FileText },
  enviado: { tom: "ciano", icone: Truck },
  entregue: { tom: "verde", icone: PackageCheck },
  cancelado: { tom: "vermelho", icone: XCircle },
  erro_pagamento: { tom: "vermelho", icone: TriangleAlert },
  devolvido: { tom: "neutro", icone: Undo2 },
};

// Rótulo traduzido do status (área do cliente), em selo com cor e ícone.
export default function StatusPedido({ status, testId }: { status: PedidoStatus; testId?: string }) {
  const t = useTranslations("pedidos.status");
  const { tom, icone } = VISUAL_STATUS[status];
  return (
    <Selo tom={tom} icone={icone} data-testid={testId}>
      {t(status)}
    </Selo>
  );
}
