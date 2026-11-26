"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Minus, Plus, ShoppingCart } from "lucide-react";
import Botao from "@/components/ui/Botao";
import { adicionarAoCarrinho } from "@/services/carrinho";

const MAX = 9999;

function quantidadeValida(texto: string): number | null {
  if (!/^\d{1,4}$/.test(texto)) return null;
  const n = Number(texto);
  return n >= 1 && n <= MAX ? n : null;
}

const botaoPasso =
  "grid size-9 shrink-0 place-items-center rounded-lg text-marca-cinza-600 transition-colors duration-150 " +
  "hover:bg-marca-cinza-100 hover:text-marca-preto disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none";

/**
 * Quantidade (− / +) e botão de adicionar. `compacto` é a versão do cartão: rótulos
 * curtos na tela e o nome do produto nos nomes acessíveis (vários cartões na página).
 */
export default function AdicionarAoCarrinho({
  produtoId,
  nomeProduto,
  compacto = false,
}: {
  produtoId: string;
  nomeProduto: string;
  compacto?: boolean;
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const id = useId();
  const [quantidade, setQuantidade] = useState("1");
  const [adicionado, setAdicionado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const qtd = quantidadeValida(quantidade);

  // O "Adicionado" do botão volta ao normal depois de um tempo.
  useEffect(() => {
    if (!confirmado) return;
    const timer = setTimeout(() => setConfirmado(false), 2500);
    return () => clearTimeout(timer);
  }, [confirmado]);

  function mudar(texto: string) {
    setQuantidade(texto);
    setAdicionado(false);
    setConfirmado(false);
    setErro(null);
  }

  function adicionar() {
    if (qtd === null) return;
    setErro(null);
    setAdicionado(false);
    iniciar(async () => {
      const r = await adicionarAoCarrinho(produtoId, qtd);
      if (r.ok) {
        setAdicionado(true);
        setConfirmado(true);
        // O IconeCarrinho escuta este evento e reconta o carrinho.
        window.dispatchEvent(new Event("carrinho:atualizado"));
      } else if (r.erro === "nao_logado") setErro(t("erroLogin"));
      else if (r.erro === "quantidade_invalida") setErro(t("erroQuantidade"));
      else setErro(t("erroIndisponivel"));
    });
  }

  const passo = (delta: number) => mudar(String(Math.min(MAX, Math.max(1, (qtd ?? 1) + delta))));
  const rotulo = compacto ? t("quantidadeDe", { nome: nomeProduto }) : t("quantidade");

  return (
    <div>
      {!compacto && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-marca-cinza-700">
          {t("quantidade")}
        </label>
      )}
      <div className={compacto ? "flex flex-col gap-2 @[15rem]:flex-row" : "flex flex-col gap-3 sm:flex-row"}>
        <div
          className={`flex items-center justify-between rounded-xl border border-marca-cinza-200 bg-marca-branco p-1 transition-colors focus-within:border-marca-preto ${
            compacto ? "h-11 @[15rem]:w-28" : "h-12 sm:w-36"
          }`}
        >
          <button
            type="button"
            onClick={() => passo(-1)}
            disabled={qtd !== null && qtd <= 1}
            aria-label={compacto ? t("diminuirDe", { nome: nomeProduto }) : t("diminuir")}
            className={botaoPasso}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={quantidade}
            onChange={(e) => mudar(e.target.value.trim())}
            onFocus={(e) => e.target.select()}
            aria-label={compacto ? rotulo : undefined}
            aria-invalid={qtd === null || undefined}
            className="w-full min-w-0 bg-transparent text-center text-[15px] font-semibold text-marca-preto tabular-nums focus:outline-none"
          />
          <button
            type="button"
            onClick={() => passo(1)}
            disabled={qtd !== null && qtd >= MAX}
            aria-label={compacto ? t("aumentarDe", { nome: nomeProduto }) : t("aumentar")}
            className={botaoPasso}
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>

        <Botao
          onClick={adicionar}
          disabled={qtd === null}
          carregando={pendente}
          icone={confirmado ? Check : ShoppingCart}
          tamanho={compacto ? "md" : "lg"}
          aria-label={compacto ? t("adicionarProduto", { nome: nomeProduto }) : undefined}
          // flex-1 só na linha: em coluna o flex-basis 0 achataria o botão.
          className={compacto ? "w-full px-3 @[15rem]:w-auto @[15rem]:flex-1" : "w-full sm:w-auto sm:flex-1"}
        >
          {pendente
            ? t("adicionando")
            : confirmado
              ? t("adicionadoCurto")
              : compacto
                ? t("adicionarCurto")
                : t("adicionar")}
        </Botao>
      </div>

      <div className={`text-sm ${compacto ? "min-h-0" : "mt-3 min-h-6"}`} aria-live="polite">
        {qtd === null && <p className="mt-2 text-marca-cinza-700">{t("erroQuantidade")}</p>}
        {erro && <p className="mt-2 text-marca-cinza-700">{erro}</p>}
        {adicionado && !compacto && (
          <p className="flex flex-wrap items-center gap-x-2 text-marca-preto">
            <Check aria-hidden className="size-4" />
            {t("adicionado")}
            <Link
              href={`/${locale}/cliente/carrinho`}
              className="group inline-flex items-center gap-1 rounded font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
            >
              {t("verCarrinho")}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
