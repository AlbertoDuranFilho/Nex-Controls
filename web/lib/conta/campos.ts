// Helpers puros da área do cliente: máscaras, listas e leitura segura de FormData.

export const LOCALES = ["pt", "en", "es"] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const INDICADORES_IE = ["contribuinte", "isento", "nao_contribuinte"] as const;
export type IndicadorIe = (typeof INDICADORES_IE)[number];

export function localeValido(valor: unknown): string {
  return typeof valor === "string" && (LOCALES as readonly string[]).includes(valor) ? valor : "pt";
}

export function ufValida(valor: string): boolean {
  return (UFS as readonly string[]).includes(valor);
}

export function indicadorValido(valor: string): valor is IndicadorIe {
  return (INDICADORES_IE as readonly string[]).includes(valor);
}

// Máscaras moram em lib/mascaras (admin e área do cliente); reexportadas para quem já importa daqui.
export { mascaraCep, mascaraTelefone } from "@/lib/mascaras";

export type LeituraForm<K extends string> = {
  valores: Record<K, string>;
  // Campo -> "tipo" (não era texto) ou "longo" (passou do limite).
  problemas: Partial<Record<K, "tipo" | "longo">>;
};

// FormData chega do cliente: só aceita string, aplica trim e limite de tamanho.
export function lerCampos<K extends string>(
  form: FormData,
  limites: Record<K, number>,
): LeituraForm<K> {
  const valores = {} as Record<K, string>;
  const problemas: Partial<Record<K, "tipo" | "longo">> = {};
  for (const campo of Object.keys(limites) as K[]) {
    const bruto = form.get(campo);
    if (bruto === null) {
      valores[campo] = "";
    } else if (typeof bruto !== "string") {
      valores[campo] = "";
      problemas[campo] = "tipo";
    } else {
      const v = bruto.trim();
      valores[campo] = v;
      if (v.length > limites[campo]) problemas[campo] = "longo";
    }
  }
  return { valores, problemas };
}
