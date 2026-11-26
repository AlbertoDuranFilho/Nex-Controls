const JANELA_MS = 3_600_000;
const MAXIMO = 5;

const registros = new Map<string, number[]>();

/** No máximo 5 envios por hora por chave (em memória, por instância). */
export function permitirEnvio(chave: string, agora: number = Date.now()): boolean {
  const recentes = (registros.get(chave) ?? []).filter((t) => agora - t <= JANELA_MS);
  if (recentes.length >= MAXIMO) {
    registros.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  registros.set(chave, recentes);
  return true;
}
