// Cliente Supabase falso para os testes: grava cada chamada da consulta encadeada e devolve
// a resposta configurada por tabela. Use dentro de jest.mock("@/lib/supabase", ...).

export type Chamada = { tabela: string; metodo: string; args: unknown[] };

export function criarSupabaseFalso() {
  const chamadas: Chamada[] = [];
  const respostas: Record<string, { data: unknown; error: unknown; status?: number }> = {};
  const rpc = jest.fn();
  const getSession = jest.fn(async () => ({
    data: { session: { access_token: "token-do-usuario", user: { id: "u1" } } },
  }));

  function from(tabela: string) {
    const resposta = () => respostas[tabela] ?? { data: null, error: null };
    const q: Record<string, unknown> = {};
    for (const metodo of ["select", "eq", "in", "is", "order", "limit", "update", "delete"]) {
      q[metodo] = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo, args });
        return q;
      };
    }
    q.maybeSingle = async () => resposta();
    q.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
      Promise.resolve(resposta()).then(ok, erro);
    return q;
  }

  /** filtros .eq(coluna, valor) feitos numa tabela */
  function filtros(tabela: string): [unknown, unknown][] {
    return chamadas
      .filter((c) => c.tabela === tabela && c.metodo === "eq")
      .map((c) => [c.args[0], c.args[1]]);
  }

  function limpar() {
    chamadas.length = 0;
    for (const k of Object.keys(respostas)) delete respostas[k];
    rpc.mockReset();
  }

  return {
    cliente: { from, rpc, auth: { getSession } },
    chamadas,
    respostas,
    rpc,
    getSession,
    filtros,
    limpar,
  };
}
