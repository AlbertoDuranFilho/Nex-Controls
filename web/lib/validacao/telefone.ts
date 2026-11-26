import { somenteDigitos } from "@/lib/validacao/documento";

export function validarTelefone(valor: string): string | null {
  const d = somenteDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  return d;
}
