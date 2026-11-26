// Aceita somente caminhos internos do locale atual. Qualquer outra coisa cai no catálogo.
export function destinoSeguro(next: string | null | undefined, locale: string): string {
  const padrao = `/${locale}/catalogo`;
  if (!next) return padrao;
  if (!next.startsWith(`/${locale}/`)) return padrao;
  if (next.includes("//") || next.includes("\\") || next.includes(":")) return padrao;
  if (/[\s\x00-\x1f\x7f]/.test(next)) return padrao;
  return next;
}
