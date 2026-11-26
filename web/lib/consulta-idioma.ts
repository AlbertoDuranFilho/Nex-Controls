// Mantém a query ao trocar de idioma (ex.: ?next= do login), trocando o idioma do next também.
export function consultaNoIdioma(search: string, de: string, para: string): string {
  const params = new URLSearchParams(search);
  const next = params.get("next");
  if (next && (next === `/${de}` || next.startsWith(`/${de}/`))) params.set("next", `/${para}${next.slice(de.length + 1)}`);
  const q = params.toString();
  return q ? `?${q}` : "";
}
