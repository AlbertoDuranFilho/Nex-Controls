"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, Lock, MessageCircle } from "lucide-react";
import Botao from "@/components/ui/Botao";
import AdicionarAoCarrinho from "@/components/catalogo/AdicionarAoCarrinho";
import PrecosCatalogo, { usePreco, ValorPreco } from "@/components/catalogo/PrecosCatalogo";

// Ilha client: a página do produto é estática; o preço só existe para lojista logado.
export default function PrecoProduto({ produtoId, nomeProduto }: { produtoId: string; nomeProduto: string }) {
  return (
    <PrecosCatalogo ids={[produtoId]}>
      <Bloco produtoId={produtoId} nomeProduto={nomeProduto} />
    </PrecosCatalogo>
  );
}

const caixa = "rounded-2xl border border-marca-cinza-200 bg-marca-cinza-50 p-5 sm:p-6";

function Aviso({ icone: Icone, children }: { icone: typeof Lock; children: React.ReactNode }) {
  return (
    <div className={`${caixa} flex items-start gap-3 text-sm text-marca-cinza-700`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-branco ring-1 ring-marca-cinza-200">
        <Icone aria-hidden className="size-4 text-marca-preto" />
      </span>
      <p className="pt-2">{children}</p>
    </div>
  );
}

function Bloco({ produtoId, nomeProduto }: { produtoId: string; nomeProduto: string }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const pathname = usePathname();
  const estado = usePreco(produtoId);

  if (estado.tipo === "carregando") {
    return (
      <div className={`${caixa} space-y-4`} aria-hidden="true">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-marca-cinza-200 motion-reduce:animate-none" />
        <div className="h-12 animate-pulse rounded-xl bg-marca-cinza-200 motion-reduce:animate-none" />
      </div>
    );
  }
  if (estado.tipo === "admin") return null;

  if (estado.tipo === "visitante") {
    return (
      <div className={caixa}>
        <Botao
          href={`/${locale}/cliente/login?next=${encodeURIComponent(pathname)}`}
          tamanho="lg"
          icone={Lock}
          className="w-full sm:w-auto"
        >
          {t("precoLogin")}
        </Botao>
      </div>
    );
  }
  if (estado.tipo === "inativo") return <Aviso icone={CircleAlert}>{t("contaInativa")}</Aviso>;
  if (estado.tipo === "consulta") return <Aviso icone={MessageCircle}>{t("sobConsulta")}</Aviso>;

  return (
    <div className={caixa}>
      <ValorPreco estado={estado} grande />
      <div className="mt-5 border-t border-marca-cinza-200 pt-5">
        <AdicionarAoCarrinho produtoId={produtoId} nomeProduto={nomeProduto} />
      </div>
    </div>
  );
}
