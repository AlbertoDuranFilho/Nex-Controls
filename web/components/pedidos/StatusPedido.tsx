import { useTranslations } from "next-intl";
import type { PedidoStatus } from "@/lib/pedidos/transicoes";

// Rótulo traduzido do status (área do cliente).
export default function StatusPedido({ status, testId }: { status: PedidoStatus; testId?: string }) {
  const t = useTranslations("pedidos.status");
  return (
    <span data-testid={testId} className="inline-block border border-marca-cinza-200 px-2 py-0.5 text-xs font-medium text-marca-preto">
      {t(status)}
    </span>
  );
}
