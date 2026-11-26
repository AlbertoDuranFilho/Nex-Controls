import { useTranslations } from "next-intl";
import { formatarMoeda } from "@/lib/formatar";
import type { Simulacao } from "@/services/carrinho";

// Valores do resumo. Frete sempre "a combinar"; ICMS/DIFAL são 0 nesta fase.
export default function ResumoPedido({ simulacao, locale }: { simulacao: Simulacao; locale: string }) {
  const t = useTranslations("carrinho");
  const s = simulacao;
  const moeda = (v: number) => formatarMoeda(v, locale);
  const rotuloDesconto =
    s.desconto_origem === "cupom"
      ? t("descontoCupom", { codigo: s.cupom.codigo ?? "" })
      : t("descontoCliente");

  return (
    <dl className="space-y-3 text-sm text-marca-cinza-700">
      <div className="flex justify-between gap-4">
        <dt>{t("subtotal")}</dt>
        <dd className="tabular-nums text-marca-preto">{moeda(s.subtotal)}</dd>
      </div>
      {s.desconto_aplicado > 0 && (
        <div data-testid="linha-desconto" className="flex justify-between gap-4">
          <dt>{rotuloDesconto}</dt>
          <dd className="font-medium whitespace-nowrap text-marca-preto tabular-nums">−{moeda(s.desconto_aplicado)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt>{t("frete")}</dt>
        <dd aria-hidden="true">—</dd>
      </div>
      <div
        data-testid="total"
        className="flex items-baseline justify-between gap-4 border-t border-marca-cinza-200 pt-4 text-marca-preto"
      >
        <dt className="text-base font-semibold">{t("total")}</dt>
        <dd className="text-2xl font-bold tracking-tight tabular-nums">{moeda(s.total)}</dd>
      </div>
    </dl>
  );
}
