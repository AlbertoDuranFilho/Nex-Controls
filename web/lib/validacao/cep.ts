import { somenteDigitos } from "@/lib/validacao/documento";

export type EnderecoCep = { logradouro: string; bairro: string; cidade: string; uf: string };

export function normalizarCep(valor: string): string | null {
  const d = somenteDigitos(valor);
  return d.length === 8 ? d : null;
}

type RespostaViaCep = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

// Nunca lança: qualquer falha (rede, timeout, HTTP != 200, CEP inexistente) vira null.
export async function buscarCep(
  cep: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<EnderecoCep | null> {
  const normalizado = normalizarCep(cep);
  if (!normalizado) return null;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const consulta = (async (): Promise<EnderecoCep | null> => {
    try {
      const url = `https://viacep.com.br/ws/${normalizado}/json/`;
      const resposta = await fetchFn(url, { signal: controller.signal });
      if (!resposta.ok) return null;
      const json = (await resposta.json()) as RespostaViaCep;
      if (!json || json.erro) return null;
      return {
        logradouro: json.logradouro ?? "",
        bairro: json.bairro ?? "",
        cidade: json.localidade ?? "",
        uf: json.uf ?? "",
      };
    } catch {
      return null;
    }
  })();

  // Corrida com um timer: um fetch que ignora o abort nunca resolve, então o timer garante o retorno.
  const limite = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([consulta, limite]);
  } finally {
    clearTimeout(timer);
  }
}
