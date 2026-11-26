import { supabase } from "./supabase";

// Mesmas regras de web/services/carrinho.ts (adicionarAoCarrinho), chamando a RPC
// carrinho_adicionar direto com a sessão do usuário (RLS: só lojista ativo, produto ativo).

export const QUANTIDADE_MINIMA = 1;
export const QUANTIDADE_MAXIMA = 9999;

export type ResultadoAdicionar =
  | { ok: true; quantidade: number }
  | { ok: false; erro: "nao_logado" | "quantidade_invalida" | "indisponivel" };

export function quantidadeValida(quantidade: number): boolean {
  return (
    Number.isInteger(quantidade) && quantidade >= QUANTIDADE_MINIMA && quantidade <= QUANTIDADE_MAXIMA
  );
}

/** Mantém a quantidade entre 1 e 9999 (stepper e campo digitado). */
export function limitarQuantidade(n: number): number {
  if (!Number.isFinite(n)) return QUANTIDADE_MINIMA;
  return Math.min(QUANTIDADE_MAXIMA, Math.max(QUANTIDADE_MINIMA, Math.floor(n)));
}

/** Texto digitado → quantidade (1–9999, só dígitos) ou null. Igual ao campo do site. */
export function lerQuantidade(texto: string): number | null {
  if (!/^\d{1,4}$/.test(texto)) return null;
  const n = Number(texto);
  return quantidadeValida(n) ? n : null;
}

export async function adicionarAoCarrinho(
  produtoId: string,
  quantidade: number,
): Promise<ResultadoAdicionar> {
  if (!quantidadeValida(quantidade)) return { ok: false, erro: "quantidade_invalida" };
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return { ok: false, erro: "nao_logado" };

    const { data, error } = await supabase.rpc("carrinho_adicionar", {
      p_produto_id: produtoId,
      p_quantidade: quantidade,
    });
    if (error) {
      if (error.message?.includes("quantidade_invalida")) {
        return { ok: false, erro: "quantidade_invalida" };
      }
      return { ok: false, erro: "indisponivel" };
    }
    return { ok: true, quantidade: Number(data) };
  } catch {
    return { ok: false, erro: "indisponivel" };
  }
}

// ===== Carrinho (simular_pedido, alterar/remover itens, criar_pedido) =====
// Mesmo formato e regras de web/services/carrinho.ts. Toda consulta a carrinho_itens filtra
// também por lojista_id = usuário atual (além da RLS).

export type ItemSimulacao = {
  produto_id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  preco_tabela: number | null;
  desconto_percentual: number | null;
  preco_unitario: number | null;
  total_linha: number;
  valido: boolean;
  motivo: null | "inativo" | "sem_preco";
};

export type CupomSimulacao = {
  codigo: string | null;
  situacao: "ausente" | "aplicado" | "pior" | "invalido";
  motivo:
    | null
    | "inexistente"
    | "inativo"
    | "fora_validade"
    | "esgotado"
    | "ja_usado"
    | "valor_minimo";
  valor_minimo: number | null;
};

export type Bloqueio = "conta_inativa" | "carrinho_vazio" | "sem_endereco" | "itens_invalidos";

export type Simulacao = {
  itens: ItemSimulacao[];
  subtotal: number;
  desconto_cliente: number;
  desconto_cupom: number;
  desconto_aplicado: number;
  desconto_origem: "nenhum" | "cliente" | "cupom";
  frete: number;
  icms: number;
  difal: number;
  total: number;
  cupom: CupomSimulacao;
  bloqueios: Bloqueio[];
};

export const LIMITE_OBSERVACAO = 500;

const numOuNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** numeric do Postgres pode chegar como número ou string dentro do jsonb: normaliza. */
export function normalizarSimulacao(bruto: Simulacao): Simulacao {
  return {
    ...bruto,
    itens: (bruto.itens ?? []).map((i) => ({
      ...i,
      quantidade: Number(i.quantidade),
      preco_tabela: numOuNull(i.preco_tabela),
      desconto_percentual: numOuNull(i.desconto_percentual),
      preco_unitario: numOuNull(i.preco_unitario),
      total_linha: Number(i.total_linha),
    })),
    subtotal: Number(bruto.subtotal),
    desconto_cliente: Number(bruto.desconto_cliente),
    desconto_cupom: Number(bruto.desconto_cupom),
    desconto_aplicado: Number(bruto.desconto_aplicado),
    frete: Number(bruto.frete),
    icms: Number(bruto.icms),
    difal: Number(bruto.difal),
    total: Number(bruto.total),
    cupom: { ...bruto.cupom, valor_minimo: numOuNull(bruto.cupom?.valor_minimo) },
    bloqueios: bruto.bloqueios ?? [],
  };
}

/** Código do cupom como o site envia: sem espaços nas pontas, até 64 caracteres; vazio = sem cupom. */
export function limparCupom(cupom: string | null | undefined): string | undefined {
  const c = cupom?.trim();
  return c ? c.slice(0, 64) : undefined;
}

export type ResultadoSimulacao =
  | { ok: true; sim: Simulacao }
  | { ok: false; motivo: "sem_sessao" | "erro" };

/** Resumo do carrinho do lojista logado (uma chamada a simular_pedido). */
export async function simularCarrinho(cupom?: string | null): Promise<ResultadoSimulacao> {
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return { ok: false, motivo: "sem_sessao" };
    const { data, error } = await supabase.rpc("simular_pedido", { p_cupom: limparCupom(cupom) });
    if (error || !data) return { ok: false, motivo: "erro" };
    return { ok: true, sim: normalizarSimulacao(data as unknown as Simulacao) };
  } catch {
    return { ok: false, motivo: "erro" };
  }
}

export async function atualizarQuantidade(
  usuarioId: string,
  produtoId: string,
  quantidade: number,
): Promise<{ ok: boolean; erro?: "quantidade_invalida" }> {
  if (!quantidadeValida(quantidade)) return { ok: false, erro: "quantidade_invalida" };
  try {
    // RLS: só o dono; o WITH CHECK recusa produto inativo.
    const { data, error } = await supabase
      .from("carrinho_itens")
      .update({ quantidade })
      .eq("lojista_id", usuarioId)
      .eq("produto_id", produtoId)
      .select("produto_id");
    return { ok: !error && (data?.length ?? 0) > 0 };
  } catch {
    return { ok: false };
  }
}

export async function removerItem(usuarioId: string, produtoId: string): Promise<{ ok: boolean }> {
  try {
    const { error } = await supabase
      .from("carrinho_itens")
      .delete()
      .eq("lojista_id", usuarioId)
      .eq("produto_id", produtoId);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** Slug e primeira imagem (menor `ordem`) de cada produto do carrinho, para a miniatura. */
export type InfoItem = { slug: string | null; imagem: string | null };

export async function buscarInfoItens(ids: readonly string[]): Promise<Map<string, InfoItem>> {
  const mapa = new Map<string, InfoItem>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;
  try {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, slug, produto_imagens(url, ordem)")
      .in("id", unicos);
    if (error || !data) return mapa;
    for (const p of data as unknown as {
      id: string;
      slug: string | null;
      produto_imagens: { url: string | null; ordem: number }[] | null;
    }[]) {
      const primeira = [...(p.produto_imagens ?? [])]
        .filter((i) => typeof i.url === "string" && i.url.trim() !== "")
        .sort((a, b) => a.ordem - b.ordem)[0];
      mapa.set(p.id, { slug: p.slug, imagem: primeira?.url ?? null });
    }
  } catch {
    // sem miniatura não impede o carrinho
  }
  return mapa;
}

type RespostaCriarPedido =
  | { ok: true; id: string; numero: number | string }
  | { ok: false; erro: string; motivo?: string; valor_minimo?: number | string | null };

export type ResultadoGerarPedido =
  | { ok: true; id: string; numero: number }
  /** erro "incerto": sem resposta do banco (rede); o pedido pode ter sido criado */
  | { ok: false; erro: string; motivo?: string; valorMinimo?: number | null };

/**
 * criar_pedido com a sessão do usuário (mesma RPC do site). Não envia e-mails: quem chama
 * dispara `notificarPedidoEmSegundoPlano(id)` depois do sucesso.
 */
export async function gerarPedido(cupom: string | null, observacao: string): Promise<ResultadoGerarPedido> {
  const obs = observacao.trim();
  if (obs.length > LIMITE_OBSERVACAO) return { ok: false, erro: "observacao_longa" };
  let resposta: { data: unknown; error: { message?: string } | null; status?: number };
  try {
    resposta = await supabase.rpc("criar_pedido", {
      p_cupom: limparCupom(cupom),
      p_observacao: obs || undefined,
    });
  } catch {
    return { ok: false, erro: "incerto" };
  }
  const { data, error, status } = resposta;
  // status 0: a requisição não teve resposta (rede caiu no meio); não dá para saber se gravou
  if (error && status === 0) return { ok: false, erro: "incerto" };
  if (error || !data) return { ok: false, erro: "erro" };

  const r = data as RespostaCriarPedido;
  if (!r.ok) {
    return {
      ok: false,
      erro: r.erro,
      ...(r.motivo ? { motivo: r.motivo } : {}),
      ...(r.valor_minimo !== undefined && r.valor_minimo !== null ? { valorMinimo: Number(r.valor_minimo) } : {}),
    };
  }
  return { ok: true, id: r.id, numero: Number(r.numero) };
}
