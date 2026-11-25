// Leitura e validação de campos de formulário do painel admin (puro, sem I/O).
import { somenteDigitos } from "@/lib/validacao/documento";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function texto(form: FormData, campo: string): string {
  const v = form.get(campo);
  return typeof v === "string" ? v.trim() : "";
}

export function opcional(form: FormData, campo: string): string | null {
  return texto(form, campo) || null;
}

export function normalizarEmail(valor: string): string | null {
  const e = valor.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

// Vazio vale 0. Aceita vírgula ou ponto decimal ("5,5"); 0 a 100, até 2 casas.
export function parseDesconto(valor: string): number | null {
  const v = valor.trim();
  if (v === "") return 0;
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(v)) return null;
  const n = Number(v.replace(",", "."));
  return n >= 0 && n <= 100 ? n : null;
}

// Termo de busca seguro para o filtro `or` do PostgREST e para ilike.
export function sanitizarBusca(busca: string): string {
  return busca
    .replace(/[,()%*\\_"'`:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function digitosBusca(busca: string): string {
  return somenteDigitos(busca);
}
