const TIMEOUT_MS = 5_000;

/** Código IBGE do município pelo CEP (ViaCEP). Qualquer falha devolve null. */
export async function buscarIbgePorCep(
  cep: string,
  f: typeof fetch = fetch,
): Promise<number | null> {
  const digitos = cep.replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  try {
    const res = await f(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { erro?: unknown; ibge?: unknown };
    if (json.erro) return null;
    const n = Number(json.ibge);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
