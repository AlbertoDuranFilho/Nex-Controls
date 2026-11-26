import { textos } from "@/constants/textos";
import { formatarMoeda } from "./precos";

// Mesmo mapeamento de web/lib/carrinho/mensagens.ts, com os textos em português do site.

const t = textos.carrinho;

const CUPOM: Record<string, string> = {
  inexistente: t.cupomInexistente,
  inativo: t.cupomInativo,
  fora_validade: t.cupomForaValidade,
  esgotado: t.cupomEsgotado,
  ja_usado: t.cupomJaUsado,
};

const BLOQUEIO: Record<string, string> = {
  conta_inativa: t.bloqueioContaInativa,
  carrinho_vazio: t.bloqueioCarrinhoVazio,
  sem_endereco: t.bloqueioSemEndereco,
  itens_invalidos: t.bloqueioItensInvalidos,
  observacao_longa: t.erroObservacaoLonga,
};

/** Motivo de cupom inválido (simular_pedido/criar_pedido) → mensagem. `valor_minimo` mostra o valor em R$. */
export function mensagemCupom(motivo: string, valorMinimo: number | null): string {
  if (motivo === "valor_minimo") return t.cupomValorMinimo(formatarMoeda(Number(valorMinimo ?? 0)));
  return Object.hasOwn(CUPOM, motivo) ? CUPOM[motivo] : t.cupomErro;
}

/** Bloqueio (simular_pedido) ou erro (criar_pedido) → mensagem. Desconhecido: genérica. */
export function mensagemBloqueio(bloqueio: string): string {
  return Object.hasOwn(BLOQUEIO, bloqueio) ? BLOQUEIO[bloqueio] : t.bloqueioErro;
}
