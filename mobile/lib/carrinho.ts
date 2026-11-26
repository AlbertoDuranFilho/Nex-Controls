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
