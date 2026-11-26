import { useCallback, useEffect, useMemo, useState } from "react";
import type { Papel } from "./perfil";
import { useSessao } from "./sessao";
import { supabase } from "./supabase";

// Preço do cliente (RPC precos_cliente, security invoker + RLS, igual ao site).
// Só devolve linha para lojista ativo e produto com preço cadastrado.

export type PrecoCliente = {
  tabela: number;
  final: number;
  /** percentual de desconto do cliente (0 = sem desconto) */
  desconto: number;
};

export type MapaPrecos = Map<string, PrecoCliente>;

export type ResultadoPrecos = { ok: true; precos: MapaPrecos } | { ok: false };

type LinhaPreco = {
  produto_id: string;
  preco_tabela: number | string;
  preco_final: number | string;
  desconto_percentual: number | string | null;
};

/** numeric do Postgres pode chegar como string: normaliza e descarta linhas inválidas. */
export function mapaDePrecos(linhas: readonly LinhaPreco[] | null | undefined): MapaPrecos {
  const mapa: MapaPrecos = new Map();
  for (const l of linhas ?? []) {
    const tabela = Number(l.preco_tabela);
    const final = Number(l.preco_final);
    const desconto = Number(l.desconto_percentual ?? 0);
    if (!Number.isFinite(tabela) || !Number.isFinite(final)) continue;
    mapa.set(l.produto_id, { tabela, final, desconto: Number.isFinite(desconto) ? desconto : 0 });
  }
  return mapa;
}

/** Uma única chamada a precos_cliente para todos os ids (lista ou produto). */
export async function buscarPrecos(ids: readonly string[]): Promise<ResultadoPrecos> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return { ok: true, precos: new Map() };
  try {
    const { data, error } = await supabase.rpc("precos_cliente", { p_produto_ids: unicos });
    if (error) return { ok: false };
    return { ok: true, precos: mapaDePrecos(data) };
  } catch {
    return { ok: false };
  }
}

/** Situação dos preços da tela (uma busca para a lista inteira). */
export type SituacaoPrecos = "ocioso" | "carregando" | "ok" | "erro";

export type EstadoPreco =
  | { tipo: "carregando" }
  /** sem login: "Entre para ver preços" */
  | { tipo: "visitante" }
  /** logado, mas papel ou preços não carregaram: sem preço e sem botão (aviso com "Tentar de novo") */
  | { tipo: "erro" }
  /** lojista inativo ou produto sem preço */
  | { tipo: "consulta" }
  | ({ tipo: "preco" } & PrecoCliente);

export type EntradaEstadoPreco = {
  carregandoSessao: boolean;
  papel: Papel;
  lojistaAtivo: boolean;
  situacao: SituacaoPrecos;
  preco: PrecoCliente | undefined;
};

/** Regra única do que o cartão e a tela do produto mostram no bloco de compra. */
export function estadoPreco({
  carregandoSessao,
  papel,
  lojistaAtivo,
  situacao,
  preco,
}: EntradaEstadoPreco): EstadoPreco {
  if (carregandoSessao) return { tipo: "carregando" };
  // admin é desconectado pelo contexto de sessão; nunca vê preço
  if (papel === "visitante" || papel === "admin") return { tipo: "visitante" };
  if (papel === "erro") return { tipo: "erro" };
  if (!lojistaAtivo) return { tipo: "consulta" };
  if (situacao === "erro") return { tipo: "erro" };
  if (situacao !== "ok") return { tipo: "carregando" };
  return preco ? { tipo: "preco", ...preco } : { tipo: "consulta" };
}

/** Só mostra preço de tabela riscado e selo quando há desconto de fato. */
export function temDesconto(p: PrecoCliente): boolean {
  return p.desconto > 0 && p.final < p.tabela;
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** "-10%", "-12,5%" */
export function textoDesconto(desconto: number): string {
  return `-${percentual.format(desconto)}%`;
}

type Resultado = {
  chave: string;
  usuarioId: string;
  versao: number;
  situacao: "ok" | "erro";
  precos: MapaPrecos;
};

export type ValorPrecosCliente = {
  situacao: SituacaoPrecos;
  /** estado do bloco de compra de um produto da lista */
  estadoDe: (produtoId: string) => EstadoPreco;
  /** busca os preços de novo (puxar para atualizar, "Tentar de novo") */
  recarregar: () => void;
};

const VAZIO: MapaPrecos = new Map();

/**
 * Preços do cliente para os ids da tela: uma única chamada a precos_cliente por carga da
 * lista (e de novo só ao recarregar ou trocar de usuário). Visitante/inativo/erro não chamam.
 */
export function usePrecosCliente(ids: readonly string[] | null): ValorPrecosCliente {
  const { carregando, papel, lojistaAtivo, usuarioId } = useSessao();
  // última resposta (ok ou erro) e últimos preços bons, cada um com a lista/usuário a que vale
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [ultimoOk, setUltimoOk] = useState<Omit<Resultado, "versao" | "situacao"> | null>(null);
  const [versao, setVersao] = useState(0);

  const chave = ids ? ids.join(",") : null;
  const deveBuscar =
    !carregando && papel === "lojista" && lojistaAtivo && usuarioId !== null && chave !== null;

  useEffect(() => {
    if (!deveBuscar || chave === null || usuarioId === null) return;
    let vivo = true;
    void buscarPrecos(chave ? chave.split(",") : []).then((r) => {
      if (!vivo) return;
      setResultado({
        chave,
        usuarioId,
        versao,
        situacao: r.ok ? "ok" : "erro",
        precos: r.ok ? r.precos : VAZIO,
      });
      if (r.ok) setUltimoOk({ chave, usuarioId, precos: r.precos });
    });
    return () => {
      vivo = false;
    };
  }, [deveBuscar, chave, usuarioId, versao]);

  // Resultado de outra lista/usuário não vale. `situacao` (para o aviso) é a da busca atual;
  // os cartões continuam com os últimos preços bons da mesma lista enquanto recarrega e
  // mesmo se a nova busca falhar (aí só aparece o aviso). Sem preços bons ainda: carregando/erro.
  let situacao: SituacaoPrecos = "ocioso";
  let situacaoCartoes: SituacaoPrecos = "ocioso";
  let precos: MapaPrecos = VAZIO;
  if (deveBuscar) {
    const atual =
      resultado !== null && resultado.chave === chave && resultado.usuarioId === usuarioId && resultado.versao === versao
        ? resultado
        : null;
    situacao = atual ? atual.situacao : "carregando";
    const guardado = ultimoOk !== null && ultimoOk.chave === chave && ultimoOk.usuarioId === usuarioId;
    if (guardado) {
      situacaoCartoes = "ok";
      precos = ultimoOk.precos;
    } else {
      situacaoCartoes = situacao;
    }
  }

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const estadoDe = useCallback(
    (produtoId: string) =>
      estadoPreco({
        carregandoSessao: carregando,
        papel,
        lojistaAtivo,
        situacao: situacaoCartoes,
        preco: precos.get(produtoId),
      }),
    [carregando, papel, lojistaAtivo, situacaoCartoes, precos],
  );

  return useMemo(() => ({ situacao, estadoDe, recarregar }), [situacao, estadoDe, recarregar]);
}
