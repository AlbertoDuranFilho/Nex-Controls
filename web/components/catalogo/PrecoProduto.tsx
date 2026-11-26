"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/formatar";
import { adicionarAoCarrinho } from "@/services/carrinho";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "visitante" }
  | { tipo: "admin" }
  | { tipo: "inativo" }
  | { tipo: "consulta" }
  | { tipo: "preco"; tabela: number; final: number; desconto: number };

function quantidadeValida(texto: string): number | null {
  if (!/^\d{1,4}$/.test(texto)) return null;
  const n = Number(texto);
  return n >= 1 && n <= 9999 ? n : null;
}

// Ilha client: a página do produto é estática; o preço só existe para lojista logado.
export default function PrecoProduto({ produtoId }: { produtoId: string }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const pathname = usePathname();
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [quantidade, setQuantidade] = useState("1");
  const [adicionado, setAdicionado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;
    async function carregar() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return ativo && setEstado({ tipo: "visitante" });
      if (user.app_metadata?.papel === "admin") return ativo && setEstado({ tipo: "admin" });

      // precos_cliente só pode ser chamada com sessão (anon não tem execute).
      const { data: linhas, error } = await supabase.rpc("precos_cliente", {
        p_produto_ids: [produtoId],
      });
      if (!ativo) return;
      const linha = error ? undefined : linhas?.[0];
      if (linha) {
        return setEstado({
          tipo: "preco",
          tabela: Number(linha.preco_tabela),
          final: Number(linha.preco_final),
          desconto: Number(linha.desconto_percentual),
        });
      }
      const { data: ativoLojista } = await supabase.rpc("is_lojista_ativo");
      if (ativo) setEstado({ tipo: ativoLojista ? "consulta" : "inativo" });
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [produtoId]);

  const caixa = "h-44"; // altura fixa (maior estado + feedback): sem CLS

  if (estado.tipo === "carregando") {
    return <div className={`${caixa} animate-pulse bg-marca-cinza-100`} aria-hidden="true" />;
  }
  if (estado.tipo === "admin") return null;

  if (estado.tipo === "visitante") {
    return (
      <div className={caixa}>
        <Link
          href={`/${locale}/cliente/login?next=${encodeURIComponent(pathname)}`}
          className="inline-block border border-marca-preto px-4 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
        >
          {t("precoLogin")}
        </Link>
      </div>
    );
  }
  if (estado.tipo === "inativo") {
    return <p className={`${caixa} text-sm text-marca-cinza-700`}>{t("contaInativa")}</p>;
  }
  if (estado.tipo === "consulta") {
    return <p className={`${caixa} text-sm text-marca-cinza-700`}>{t("sobConsulta")}</p>;
  }

  const qtd = quantidadeValida(quantidade);

  function adicionar() {
    if (qtd === null) return;
    setErro(null);
    setAdicionado(false);
    iniciar(async () => {
      const r = await adicionarAoCarrinho(produtoId, qtd);
      if (r.ok) {
        setAdicionado(true);
        window.dispatchEvent(new Event("carrinho:atualizado"));
      } else if (r.erro === "nao_logado") setErro(t("erroLogin"));
      else if (r.erro === "quantidade_invalida") setErro(t("erroQuantidade"));
      else setErro(t("erroIndisponivel"));
    });
  }

  return (
    <div className={caixa}>
      <div className="flex items-baseline gap-3">
        {estado.desconto > 0 && (
          <span data-testid="preco-tabela" className="text-marca-cinza-500 line-through">
            {formatarMoeda(estado.tabela, locale)}
          </span>
        )}
        <span data-testid="preco-final" className="text-2xl font-semibold text-marca-preto">
          {formatarMoeda(estado.final, locale)}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <label className="flex flex-col text-sm text-marca-cinza-700">
          {t("quantidade")}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            step={1}
            value={quantidade}
            onChange={(e) => {
              setQuantidade(e.target.value);
              setAdicionado(false);
              setErro(null);
            }}
            className="mt-1 w-24 border border-marca-cinza-300 px-3 py-2 text-marca-preto"
          />
        </label>
        <button
          type="button"
          onClick={adicionar}
          disabled={qtd === null || pendente}
          className="bg-marca-preto px-5 py-2 text-sm font-medium text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-400"
        >
          {pendente ? t("adicionando") : t("adicionar")}
        </button>
      </div>

      <div className="mt-3 h-10 overflow-hidden text-sm" aria-live="polite">
        {qtd === null && <p className="text-marca-cinza-700">{t("erroQuantidade")}</p>}
        {erro && <p className="text-marca-cinza-700">{erro}</p>}
        {adicionado && (
          <p className="text-marca-preto">
            {t("adicionado")}{" "}
            <Link href={`/${locale}/cliente/carrinho`} className="underline underline-offset-2">
              {t("verCarrinho")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
