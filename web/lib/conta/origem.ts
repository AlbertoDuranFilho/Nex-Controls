type Entrada = {
  siteUrl?: string | null;
  producao: boolean;
  host?: string | null;
  proto?: string | null;
};

// Origem usada no link do e-mail de troca. Falha fechado: com NEXT_PUBLIC_SITE_URL definida usa só
// ela; em produção sem ela não há origem (nunca confia em headers); fora de produção aceita o host
// da requisição se for sintaticamente válido. null = não foi possível resolver.
export function resolverOrigem({ siteUrl, producao, host, proto }: Entrada): string | null {
  const configurada = siteUrl?.trim().replace(/\/+$/, "");
  if (configurada) return /^https?:\/\/[^\s/]+$/i.test(configurada) ? configurada : null;
  if (producao) return null;
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1)(:|$)/i.test(host);
  const p = proto?.split(",")[0]?.trim();
  return `${p === "http" || p === "https" ? p : local ? "http" : "https"}://${host}`;
}
