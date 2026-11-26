import { formatarMoeda } from "@/lib/formatar";

// Tradutor do namespace "carrinho" (useTranslations/getTranslations). Mantém as funções puras.
export type Tradutor = (chave: string, valores?: Record<string, string | number>) => string;

const CUPOM: Record<string, string> = {
  inexistente: "cupomInexistente",
  inativo: "cupomInativo",
  fora_validade: "cupomForaValidade",
  esgotado: "cupomEsgotado",
  ja_usado: "cupomJaUsado",
  valor_minimo: "cupomValorMinimo",
};

const BLOQUEIO: Record<string, string> = {
  conta_inativa: "bloqueioContaInativa",
  carrinho_vazio: "bloqueioCarrinhoVazio",
  sem_endereco: "bloqueioSemEndereco",
  itens_invalidos: "bloqueioItensInvalidos",
  observacao_longa: "erroObservacaoLonga",
};

export function chaveCupom(motivo: string): string {
  return Object.hasOwn(CUPOM, motivo) ? CUPOM[motivo] : "cupomErro";
}

export function chaveBloqueio(bloqueio: string): string {
  return Object.hasOwn(BLOQUEIO, bloqueio) ? BLOQUEIO[bloqueio] : "bloqueioErro";
}

/** Motivo de cupom inválido (simular_pedido) → mensagem. `valor_minimo` interpola o valor em R$. */
export function mensagemCupom(
  motivo: string,
  valorMinimo: number | null,
  t: Tradutor,
  locale = "pt-BR",
): string {
  const chave = chaveCupom(motivo);
  if (chave === "cupomValorMinimo") {
    return t(chave, { valor: formatarMoeda(Number(valorMinimo ?? 0), locale) });
  }
  return t(chave);
}

/** Bloqueio (simular_pedido) ou erro (criar_pedido) → mensagem. */
export function mensagemBloqueio(bloqueio: string, t: Tradutor): string {
  return t(chaveBloqueio(bloqueio));
}
