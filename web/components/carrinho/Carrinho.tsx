"use client";

import { useState } from "react";
import { useTransicao } from "@/lib/react/destravar-transicao";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CircleAlert,
  ClipboardCheck,
  ImageOff,
  Info,
  LayoutGrid,
  MapPin,
  Minus,
  Plus,
  Receipt,
  ShoppingCart,
  StickyNote,
  TicketPercent,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import ResumoPedido from "@/components/carrinho/ResumoPedido";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import { mensagemBloqueio, mensagemCupom, type Tradutor } from "@/lib/carrinho/mensagens";
import { formatarMoeda } from "@/lib/formatar";
import { imagemNaoOtimizada } from "@/lib/imagem";
import type { Miniatura } from "@/services/catalogo";
import {
  atualizarQuantidade,
  gerarPedido,
  removerItem,
  simularCarrinho,
  type ItemSimulacao,
  type Simulacao,
} from "@/services/carrinho";

const LIMITE_OBSERVACAO = 500;
const MAX = 9999;

function quantidadeValida(texto: string): number | null {
  if (!/^\d{1,4}$/.test(texto.trim())) return null;
  const n = Number(texto);
  return n >= 1 && n <= MAX ? n : null;
}

const qtdsDe = (s: Simulacao) => Object.fromEntries(s.itens.map((i) => [i.produto_id, String(i.quantidade)]));

function avisarCabecalho() {
  window.dispatchEvent(new Event("carrinho:atualizado"));
}

const botaoIcone =
  "grid size-9 shrink-0 place-items-center rounded-lg text-marca-cinza-600 transition-colors duration-150 " +
  "hover:bg-marca-cinza-100 hover:text-marca-preto disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none";

export default function Carrinho({
  locale,
  inicial,
  miniaturas = {},
}: {
  locale: string;
  inicial: Simulacao;
  /** Só exibição: imagem e slug por produto_id. */
  miniaturas?: Record<string, Miniatura>;
}) {
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
  // Falha sem resposta ao gerar: o pedido pode ter sido criado. Orienta a conferir em Meus pedidos.
  const [incerto, setIncerto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pendente, iniciar] = useTransicao();
  const moeda = (v: number) => formatarMoeda(v, locale);

  // Toda alteração termina aqui: uma chamada a simular_pedido com o cupom atual.
  async function recalcular(cupomAtual: string | null) {
    try {
      const r = await simularCarrinho(cupomAtual ?? undefined);
      if (!r.ok) {
        setErro(t("erroAtualizar"));
        return;
      }
      setSim(r.sim);
      setQtds(qtdsDe(r.sim));
    } catch {
      setErro(t("erroAtualizar"));
    }
  }

  function salvarQuantidade(item: ItemSimulacao, n: number) {
    if (n === item.quantidade) return;
    setErro(null);
    iniciar(async () => {
      const r = await atualizarQuantidade(item.produto_id, n);
      if (!r.ok) setErro(r.erro === "quantidade_invalida" ? t("erroQuantidade") : t("erroAtualizar"));
      await recalcular(cupom);
      avisarCabecalho();
    });
  }

  function confirmarQuantidade(item: ItemSimulacao) {
    const texto = qtds[item.produto_id] ?? "";
    const n = quantidadeValida(texto);
    if (n === null) {
      setErro(t("erroQuantidade"));
      setQtds((a) => ({ ...a, [item.produto_id]: String(item.quantidade) }));
      return;
    }
    salvarQuantidade(item, n);
  }

  // Botões − / +: mesma gravação do campo, a partir do valor atual.
  function passo(item: ItemSimulacao, delta: number) {
    const atual = quantidadeValida(qtds[item.produto_id] ?? "") ?? item.quantidade;
    const n = Math.min(MAX, Math.max(1, atual + delta));
    setQtds((a) => ({ ...a, [item.produto_id]: String(n) }));
    salvarQuantidade(item, n);
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
    setIncerto(false);
    setEnviando(true);
    let navegando = false;
    try {
      const r = await gerarPedido(cupom, observacao);
      if (r.ok) {
        avisarCabecalho();
        navegando = true; // segue "enviando" até a navegação: sem segundo clique
        router.push(`/${locale}/cliente/pedidos/${r.numero}?novo=1`);
        return;
      }
      await recalcular(cupom);
      setErro(
        r.erro === "cupom_invalido"
          ? mensagemCupom(r.motivo ?? "", r.valorMinimo ?? null, tr, locale)
          : mensagemBloqueio(r.erro, tr),
      );
    } catch {
      // Sem resposta (rede, timeout): não dá para saber se o pedido foi criado.
      setIncerto(true);
    } finally {
      if (!navegando) setEnviando(false);
    }
  }

  if (sim.itens.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-marca-cinza-300 bg-marca-branco px-6 py-14 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-marca-cinza-100 text-marca-preto">
          <ShoppingCart aria-hidden className="size-7" strokeWidth={1.5} />
        </span>
        <p className="mt-5 text-lg font-semibold text-marca-preto">{t("vazio")}</p>
        <p className="mt-1 max-w-sm text-sm text-marca-cinza-600">{t("vazioDica")}</p>
        <Botao href={`/${locale}/catalogo`} icone={LayoutGrid} className="mt-6 px-6">
          {t("irCatalogo")}
        </Botao>
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
  const temAlerta = incerto || !!erro;

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start"
      aria-busy={ocupado}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="font-medium text-marca-cinza-600">{t("contagemItens", { count: sim.itens.length })}</p>
          <Link
            href={`/${locale}/catalogo`}
            className="group inline-flex items-center gap-1.5 rounded-lg font-medium text-marca-cinza-700 underline-offset-4 hover:text-marca-preto hover:underline focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
          >
            <ArrowLeft
              aria-hidden
              className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
            {t("continuarComprando")}
          </Link>
        </div>

        <ul className="space-y-3">
          {sim.itens.map((item) => {
            const mini = miniaturas[item.produto_id];
            const img = mini?.imagem;
            const href = mini ? `/${locale}/catalogo/${mini.slug}` : null;
            const qtdAtual = quantidadeValida(qtds[item.produto_id] ?? "");
            return (
              <li
                key={item.produto_id}
                data-testid="item-carrinho"
                className={`flex gap-4 rounded-2xl border bg-marca-branco p-4 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none sm:p-5 ${
                  item.valido ? "border-marca-cinza-200" : "border-marca-cinza-300 border-dashed"
                }`}
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-marca-cinza-100 bg-marca-cinza-50 sm:size-24">
                  {img ? (
                    <Image
                      src={img.url}
                      unoptimized={imagemNaoOtimizada(img.url)}
                      alt=""
                      fill
                      sizes="96px"
                      className={`object-contain p-2 ${item.valido ? "" : "opacity-50 grayscale"}`}
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <ImageOff aria-hidden className="size-6 text-marca-cinza-300" strokeWidth={1.25} />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-marca-cinza-100 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-marca-cinza-700">
                      {item.codigo}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug font-medium text-marca-preto">
                      {href ? (
                        <Link
                          href={href}
                          className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
                        >
                          {item.nome}
                        </Link>
                      ) : (
                        item.nome
                      )}
                    </p>
                    {item.valido ? (
                      <p className="mt-1 text-sm text-marca-cinza-600 tabular-nums">
                        {t("porUnidade", { valor: moeda(item.preco_unitario ?? 0) })}
                      </p>
                    ) : (
                      <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-marca-preto">
                        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                        {item.motivo === "sem_preco" ? t("itemSemPreco") : t("itemInativo")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(item)}
                    disabled={ocupado}
                    aria-label={t("removerDe", { nome: item.nome })}
                    title={t("remover")}
                    className={`${botaoIcone} -mt-1 -mr-1`}
                  >
                    <Trash2 aria-hidden className="size-[18px]" />
                  </button>
                  </div>

                  {item.valido && (
                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                      <div className="flex h-11 w-32 items-center justify-between rounded-xl border border-marca-cinza-200 bg-marca-branco p-1 transition-colors focus-within:border-marca-preto">
                        <button
                          type="button"
                          onClick={() => passo(item, -1)}
                          disabled={ocupado || (qtdAtual !== null && qtdAtual <= 1)}
                          aria-label={t("diminuirDe", { nome: item.nome })}
                          className={botaoIcone}
                        >
                          <Minus aria-hidden className="size-4" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={t("quantidadeDe", { nome: item.nome })}
                          value={qtds[item.produto_id] ?? ""}
                          disabled={ocupado}
                          onChange={(e) => setQtds((a) => ({ ...a, [item.produto_id]: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => confirmarQuantidade(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              confirmarQuantidade(item);
                            }
                          }}
                          className="w-full min-w-0 bg-transparent text-center text-[15px] font-semibold text-marca-preto tabular-nums focus:outline-none disabled:text-marca-cinza-500"
                        />
                        <button
                          type="button"
                          onClick={() => passo(item, 1)}
                          disabled={ocupado || (qtdAtual !== null && qtdAtual >= MAX)}
                          aria-label={t("aumentarDe", { nome: item.nome })}
                          className={botaoIcone}
                        >
                          <Plus aria-hidden className="size-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-marca-cinza-500">{t("totalLinha")}</p>
                        <p className="text-lg font-semibold whitespace-nowrap text-marca-preto tabular-nums">
                          {moeda(item.total_linha)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p
          role="alert"
          aria-live="polite"
          className={
            temAlerta
              ? "flex items-start gap-2.5 rounded-xl border border-marca-preto bg-marca-branco px-4 py-3 text-sm text-marca-preto"
              : "sr-only"
          }
        >
          {temAlerta && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>
            {incerto ? (
              <>
                {t("erroGerarIncerto")}{" "}
                <Link href={`/${locale}/cliente/pedidos`} className="font-medium underline underline-offset-2">
                  {t("irMeusPedidos")}
                </Link>
              </>
            ) : (
              erro
            )}
          </span>
        </p>

        {/* Sem aria-labelledby: o nome da seção não deve competir com o rótulo "Observação". */}
        <CartaoConta titulo={t("observacaoTitulo")} icone={StickyNote}>
          <label htmlFor="observacao" className={estiloRotulo}>
            {t("observacao")}
          </label>
          <textarea
            id="observacao"
            rows={3}
            value={observacao}
            maxLength={LIMITE_OBSERVACAO}
            onChange={(e) => setObservacao(e.target.value)}
            aria-describedby="observacao-ajuda"
            className={`${estiloCampo} resize-y`}
          />
          <div id="observacao-ajuda" className="mt-1.5 flex justify-between gap-4 text-xs text-marca-cinza-600">
            <span>{t("observacaoAjuda")}</span>
            <span className="tabular-nums">
              {observacao.length}/{LIMITE_OBSERVACAO}
            </span>
          </div>
        </CartaoConta>
      </div>

      <aside
        aria-labelledby="titulo-resumo"
        className="space-y-6 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-5 shadow-suave sm:p-6 xl:sticky xl:top-28"
      >
        <h2 id="titulo-resumo" className="flex items-center gap-2.5 text-lg font-semibold text-marca-preto">
          <Receipt aria-hidden className="size-5" strokeWidth={1.75} />
          {t("resumo")}
        </h2>

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
            <div className="group relative min-w-0 flex-1">
              <TicketPercent
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-marca-cinza-400 transition-colors group-focus-within:text-marca-preto"
              />
              <input
                id="cupom"
                value={cupomTexto}
                maxLength={64}
                autoComplete="off"
                onChange={(e) => setCupomTexto(e.target.value)}
                aria-describedby="mensagem-cupom"
                className={`${estiloCampo} pl-10 font-medium tracking-wide uppercase placeholder:normal-case`}
              />
            </div>
            <Botao
              type="submit"
              variante="secundario"
              disabled={ocupado || !cupomTexto.trim()}
              className="h-12 px-4"
            >
              {t("aplicar")}
            </Botao>
          </div>
          <div
            id="mensagem-cupom"
            data-testid="mensagem-cupom"
            aria-live="polite"
            className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-marca-cinza-700"
          >
            {msgCupom ?? (!cupom && <span className="text-marca-cinza-500">{t("cupomDica")}</span>)}
            {cupom && (
              <button
                type="button"
                onClick={() => aplicarCupom(null)}
                disabled={ocupado}
                className="inline-flex items-center gap-1 rounded-full bg-marca-cinza-100 px-2.5 py-0.5 text-xs font-medium text-marca-cinza-700 transition-colors hover:bg-marca-cinza-200 hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
              >
                <X aria-hidden className="size-3" />
                {t("tirarCupom")}
              </button>
            )}
          </div>
        </form>

        <div className="border-t border-marca-cinza-100 pt-5">
          <ResumoPedido simulacao={sim} locale={locale} />
        </div>

        {bloqueios.length > 0 && (
          <ul className="space-y-2 rounded-xl bg-marca-cinza-50 p-4 text-sm text-marca-preto">
            {bloqueios.map((b) => (
              <li key={b} className="flex items-start gap-2">
                {b === "sem_endereco" ? (
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                )}
                <span>
                  {mensagemBloqueio(b, tr)}
                  {b === "sem_endereco" && (
                    <>
                      {" "}
                      <Link
                        href={`/${locale}/cliente/endereco`}
                        className="font-semibold underline underline-offset-2"
                      >
                        {t("cadastrarEndereco")}
                      </Link>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Botao
          onClick={gerar}
          disabled={bloqueado || ocupado}
          carregando={enviando}
          icone={ClipboardCheck}
          tamanho="lg"
          className="w-full"
        >
          {enviando ? t("gerando") : t("gerar")}
        </Botao>
        <p className="flex items-start gap-2 text-xs text-marca-cinza-600">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          {t("aviso")}
        </p>
      </aside>
    </div>
  );
}
