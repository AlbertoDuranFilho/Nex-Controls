"use client";

import { useActionState, useEffect, useReducer, useTransition } from "react";

// Contorno de um bug do React 19.2 canary que vem embutido no Next 15.5.
//
// Quando uma Server Action revalida a página, a resposta traz a árvore nova e o
// React a renderiza numa transição. Se essa renderização suspende num trecho que
// ainda está chegando do servidor, dentro de uma área que já está na tela (não pode
// voltar ao esqueleto), o React marca a transição como "suspensa" e espera um "ping".
// O cliente do RSC às vezes entrega esse ping de forma síncrona, no meio da própria
// renderização; logo em seguida o React limpa os pings daquela faixa e a transição
// fica parada para sempre: o botão continua "pendente" e o resultado da ação (que o
// servidor já devolveu) nunca aparece. Em celular lento acontece mais.
//
// Qualquer atualização de estado fora da transição faz o React reavaliar as faixas
// suspensas e retomar o trabalho. Então, enquanto há uma ação pendente, damos uma
// "cutucada" (estado local trivial) de tempos em tempos, com intervalo crescente para
// não atrapalhar uma renderização legítima e demorada.

const PRIMEIRA_MS = 300;
const TETO_MS = 2000;

export function iniciarCutucadas(cutucar: () => void): () => void {
  let atraso = PRIMEIRA_MS;
  let id: ReturnType<typeof setTimeout>;
  const agendar = () => {
    id = setTimeout(() => {
      cutucar();
      atraso = Math.min(atraso * 2, TETO_MS);
      agendar();
    }, atraso);
  };
  agendar();
  return () => clearTimeout(id);
}

export function useDestravarTransicao(pendente: boolean): void {
  const [, cutucar] = useReducer((n: number) => n + 1, 0);
  useEffect(() => (pendente ? iniciarCutucadas(cutucar) : undefined), [pendente]);
}

// useActionState / useTransition com o contorno acima. Mesma assinatura do React.
export const useAcao = ((...args: Parameters<typeof useActionState>) => {
  const resultado = (useActionState as (...a: unknown[]) => [unknown, unknown, boolean])(...args);
  useDestravarTransicao(resultado[2]);
  return resultado;
}) as typeof useActionState;

export function useTransicao(): ReturnType<typeof useTransition> {
  const resultado = useTransition();
  useDestravarTransicao(resultado[0]);
  return resultado;
}
