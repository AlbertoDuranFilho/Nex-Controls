"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ResumoPedido from "@/components/carrinho/ResumoPedido";
import { estiloBotao, estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import { mensagemBloqueio, mensagemCupom, type Tradutor } from "@/lib/carrinho/mensagens";
import { formatarMoeda } from "@/lib/formatar";
import {
  atualizarQuantidade,
  gerarPedido,
  removerItem,
  simularCarrinho,
  type ItemSimulacao,
  type Simulacao,
} from "@/services/carrinho";

const LIMITE_OBSERVACAO = 500;

function quantidadeValida(texto: string): number | null {
  if (!/^\d{1,4}$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= 1 && n <= 9999 ? n : null;
}

const qtdsDe = (s: Simulacao) => Object.fromEntries(s.itens.map((i) => [i.produto_id, String(i.quantidade)]));

function avisarCabecalho() {
  window.dispatchEvent(new Event("carrinho:atualizado"));
}

export default function Carrinho({ locale, inicial }: { locale: string; inicial: Simulacao }) {
  const t = useTranslations("carrinho");
  const tr = t as unknown as Tradutor;
  const router = useRouter();
  const [sim, setSim] = useState(inicial);
  const [qtds, setQtds] = useState<Record<string, string>>(() => qtdsDe(inicial));
  // Cupom aplicado: reenviado a cada simulação. cupomTexto é só o campo.
  const [cupom, setCupom] = useState<string | null>(null);
  const [cupomTexto, setCupomTexto] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const moeda = (v: number) => formatarMoeda(v, locale);

  // Toda alteração termina aqui: uma chamada a simular_pedido com o cupom atual.
  async function recalcular(cupomAtual: string | null) {
    const nova = await simularCarrinho(cupomAtual ?? undefined);
    if (!nova) {
      setErro(t("erroAtualizar"));
      return;
    }
    setSim(nova);
    setQtds(qtdsDe(nova));
  }

  function confirmarQuantidade(item: ItemSimulacao) {
    const texto = qtds[item.produto_id] ?? "";
    const n = quantidadeValida(texto);
    if (n === null) {
      setErro(t("erroQuantidade"));
      setQtds((a) => ({ ...a, [item.produto_id]: String(item.quantidade) }));
      return;
    }
    if (n === item.quantidade) return;
    setErro(null);
    iniciar(async () => {
      const r = await atualizarQuantidade(item.produto_id, n);
      if (!r.ok) setErro(r.erro === "quantidade_invalida" ? t("erroQuantidade") : t("erroAtualizar"));
      await recalcular(cupom);
      avisarCabecalho();
    });
  }

  function remover(item: ItemSimulacao) {
    setErro(null);
    iniciar(async () => {
      const r = await removerItem(item.produto_id);
      if (!r.ok) setErro(t("erroAtualizar"));
      await recalcular(cupom);
      avisarCabecalho();
    });
  }

  function aplicarCupom(codigo: string | null) {
    setErro(null);
    setCupom(codigo);
    if (!codigo) setCupomTexto("");
    iniciar(() => recalcular(codigo));
  }

  async function gerar() {
    setErro(null);
    setEnviando(true);
    const r = await gerarPedido(cupom, observacao);
    if (r.ok) {
      avisarCabecalho();
      router.push(`/${locale}/cliente/pedidos/${r.numero}?novo=1`);
      return; // segue "enviando" até a navegação: sem segundo clique
    }
    setErro(
      r.erro === "cupom_invalido"
        ? mensagemCupom(r.motivo ?? "", null, tr, locale)
        : mensagemBloqueio(r.erro, tr),
    );
    await recalcular(cupom);
    setEnviando(false);
  }

  if (sim.itens.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-marca-cinza-700">{t("vazio")}</p>
        <Link
          href={`/${locale}/catalogo`}
          className="inline-block border border-marca-preto px-4 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
        >
          {t("irCatalogo")}
        </Link>
      </div>
    );
  }

  const c = sim.cupom;
  let msgCupom: string | null = null;
  if (c.situacao === "aplicado") msgCupom = t("cupomAplicado", { codigo: c.codigo ?? "" });
  else if (c.situacao === "pior") msgCupom = t("cupomPior", { codigo: c.codigo ?? "" });
  else if (c.situacao === "invalido") msgCupom = mensagemCupom(c.motivo ?? "", c.valor_minimo, tr, locale);

  const bloqueios = sim.bloqueios.filter((b) => b !== "carrinho_vazio");
  const obsLonga = observacao.length > LIMITE_OBSERVACAO;
  const bloqueado = bloqueios.length > 0 || c.situacao === "invalido" || obsLonga;
  const ocupado = pendente || enviando;

  return (
    <div className="space-y-10" aria-busy={ocupado}>
      <ul className="divide-y divide-marca-cinza-200 border-y border-marca-cinza-200">
        {sim.itens.map((item) => (
          <li
            key={item.produto_id}
            data-testid="item-carrinho"
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-marca-preto">{item.nome}</p>
              <p className="text-xs text-marca-cinza-600">{item.codigo}</p>
              {!item.valido && (
                <p className="mt-1 text-sm font-medium text-marca-preto">
                  {item.motivo === "sem_preco" ? t("itemSemPreco") : t("itemInativo")}
                </p>
              )}
            </div>

            {item.valido && (
              <>
                <label className="flex flex-col text-xs text-marca-cinza-600">
                  {t("quantidade")}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={9999}
                    step={1}
                    aria-label={t("quantidadeDe", { nome: item.nome })}
                    value={qtds[item.produto_id] ?? ""}
                    disabled={ocupado}
                    onChange={(e) => setQtds((a) => ({ ...a, [item.produto_id]: e.target.value }))}
                    onBlur={() => confirmarQuantidade(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        confirmarQuantidade(item);
                      }
                    }}
                    className="mt-1 w-24 border border-marca-cinza-300 px-3 py-2 text-sm text-marca-preto disabled:bg-marca-cinza-100"
                  />
                </label>
                <div className="text-sm sm:w-28 sm:text-right">
                  <p className="text-xs text-marca-cinza-600">{t("precoUnitario")}</p>
                  <p className="text-marca-cinza-800">{moeda(item.preco_unitario ?? 0)}</p>
                </div>
                <div className="text-sm sm:w-28 sm:text-right">
                  <p className="text-xs text-marca-cinza-600">{t("totalLinha")}</p>
                  <p className="font-semibold text-marca-preto">{moeda(item.total_linha)}</p>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => remover(item)}
              disabled={ocupado}
              aria-label={t("removerDe", { nome: item.nome })}
              className="self-start text-sm text-marca-cinza-600 underline underline-offset-2 hover:text-marca-preto disabled:cursor-not-allowed sm:self-center"
            >
              {t("remover")}
            </button>
          </li>
        ))}
      </ul>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-marca-preto">
        {erro}
      </p>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              aplicarCupom(cupomTexto.trim() || null);
            }}
          >
            <label htmlFor="cupom" className={estiloRotulo}>
              {t("cupom")}
            </label>
            <div className="flex gap-2">
              <input
                id="cupom"
                value={cupomTexto}
                maxLength={64}
                autoComplete="off"
                onChange={(e) => setCupomTexto(e.target.value)}
                className={`${estiloCampo} uppercase`}
              />
              <button
                type="submit"
                disabled={ocupado || !cupomTexto.trim()}
                className="border border-marca-preto px-4 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco disabled:cursor-not-allowed disabled:border-marca-cinza-300 disabled:text-marca-cinza-500 disabled:hover:bg-transparent"
              >
                {t("aplicar")}
              </button>
            </div>
            <div data-testid="mensagem-cupom" aria-live="polite" className="min-h-5 text-sm text-marca-cinza-800">
              {msgCupom}
              {cupom && (
                <button
                  type="button"
                  onClick={() => aplicarCupom(null)}
                  disabled={ocupado}
                  className="ml-2 underline underline-offset-2 hover:text-marca-preto"
                >
                  {t("tirarCupom")}
                </button>
              )}
            </div>
          </form>

          <div>
            <label htmlFor="observacao" className={estiloRotulo}>
              {t("observacao")}
            </label>
            <textarea
              id="observacao"
              rows={4}
              value={observacao}
              maxLength={LIMITE_OBSERVACAO}
              onChange={(e) => setObservacao(e.target.value)}
              aria-describedby="observacao-ajuda"
              className={estiloCampo}
            />
            <div id="observacao-ajuda" className="mt-1 flex justify-between text-xs text-marca-cinza-600">
              <span>{t("observacaoAjuda")}</span>
              <span>
                {observacao.length}/{LIMITE_OBSERVACAO}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 border border-marca-cinza-200 p-6">
          <h2 className="text-lg font-semibold text-marca-preto">{t("resumo")}</h2>
          <ResumoPedido simulacao={sim} locale={locale} />

          {bloqueios.length > 0 && (
            <ul className="space-y-2 border-l-2 border-marca-preto pl-4 text-sm text-marca-preto">
              {bloqueios.map((b) => (
                <li key={b}>
                  {mensagemBloqueio(b, tr)}
                  {b === "sem_endereco" && (
                    <>
                      {" "}
                      <Link
                        href={`/${locale}/cliente/endereco`}
                        className="font-medium underline underline-offset-2"
                      >
                        {t("cadastrarEndereco")}
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={gerar}
            disabled={bloqueado || ocupado}
            className={`${estiloBotao} w-full`}
          >
            {enviando ? t("gerando") : t("gerar")}
          </button>
          <p className="text-xs text-marca-cinza-600">{t("aviso")}</p>
        </div>
      </div>
    </div>
  );
}
