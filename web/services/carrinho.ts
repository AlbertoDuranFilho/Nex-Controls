"use server";

import { createClient } from "@/lib/supabase/server";

export type ResultadoAdicionar =
  | { ok: true; quantidade: number }
  | { ok: false; erro: "nao_logado" | "quantidade_invalida" | "indisponivel" };

export async function adicionarAoCarrinho(
  produtoId: string,
  quantidade: number,
): Promise<ResultadoAdicionar> {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 9999) {
    return { ok: false, erro: "quantidade_invalida" };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "nao_logado" };

  const { data, error } = await supabase.rpc("carrinho_adicionar", {
    p_produto_id: produtoId,
    p_quantidade: quantidade,
  });
  if (error) {
    if (error.message.includes("quantidade_invalida")) {
      return { ok: false, erro: "quantidade_invalida" };
    }
    return { ok: false, erro: "indisponivel" };
  }
  return { ok: true, quantidade: data };
}
