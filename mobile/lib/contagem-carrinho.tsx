import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSessao } from "./sessao";
import { supabase } from "./supabase";

export type ValorContagemCarrinho = {
  /** soma das quantidades do carrinho (igual ao ícone do site); 0 para visitante */
  contagem: number;
  /** relê o carrinho no banco; chame depois de adicionar/alterar/remover itens ou gerar pedido */
  atualizarContagem: () => Promise<void>;
  /** define o número direto quando a tela já sabe o total (evita uma ida ao banco) */
  definirContagem: (n: number) => void;
};

const ContagemContexto = createContext<ValorContagemCarrinho | null>(null);

export function somarQuantidades(itens: readonly { quantidade: number }[] | null | undefined): number {
  return (itens ?? []).reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);
}

/** Texto do contador da aba: nada com 0, "99+" acima de 99. */
export function textoContador(contagem: number): string | undefined {
  if (contagem <= 0) return undefined;
  return contagem > 99 ? "99+" : String(contagem);
}

export function ContagemCarrinhoProvider({ children }: { children: ReactNode }) {
  const { usuarioId, papel, lojistaAtivo } = useSessao();
  const [contagem, setContagem] = useState(0);
  // descarta respostas que chegam depois de trocar de usuário/sair
  const donoAtual = useRef<string | null>(null);
  const podeTerCarrinho = papel === "lojista" && lojistaAtivo && usuarioId !== null;
  const dono = podeTerCarrinho ? usuarioId : null;
  useEffect(() => {
    donoAtual.current = dono;
  }, [dono]);

  const atualizarContagem = useCallback(async () => {
    if (!podeTerCarrinho || !usuarioId) {
      setContagem(0);
      return;
    }
    const { data, error } = await supabase
      .from("carrinho_itens")
      .select("quantidade")
      .eq("lojista_id", usuarioId);
    if (error || donoAtual.current !== usuarioId) return;
    setContagem(somarQuantidades(data));
  }, [podeTerCarrinho, usuarioId]);

  useEffect(() => {
    void atualizarContagem();
  }, [atualizarContagem]);

  const definirContagem = useCallback((n: number) => setContagem(Math.max(0, Math.floor(n))), []);

  const valor = useMemo(
    () => ({ contagem: podeTerCarrinho ? contagem : 0, atualizarContagem, definirContagem }),
    [contagem, podeTerCarrinho, atualizarContagem, definirContagem],
  );
  return <ContagemContexto.Provider value={valor}>{children}</ContagemContexto.Provider>;
}

export function useContagemCarrinho(): ValorContagemCarrinho {
  const valor = useContext(ContagemContexto);
  if (!valor) throw new Error("useContagemCarrinho precisa estar dentro de <ContagemCarrinhoProvider>.");
  return valor;
}
