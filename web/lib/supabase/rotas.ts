// Decisao pura de redirect do middleware. A autorizacao real e feita por RLS;
// o papel aqui so decide para onde mandar o usuario.
const LOCALES = ["pt", "en", "es"];

export type EstadoAuth = {
  logado: boolean;
  papel: "admin" | "lojista" | null;
};

export function ehAreaProtegida(pathname: string): boolean {
  const [locale, area] = pathname.split("/").filter(Boolean);
  return !!locale && LOCALES.includes(locale) && (area === "cliente" || area === "admin");
}

export function decidirRedirect(
  pathname: string,
  search: string,
  { logado, papel }: EstadoAuth,
): string | null {
  const [locale, area, sub] = pathname.split("/").filter(Boolean);
  if (!locale || !LOCALES.includes(locale)) return null;

  const home = papel === "admin" ? `/${locale}/admin/lojistas` : `/${locale}/cliente`;

  if (area === "cliente") {
    const ehLogin = sub === "login";
    if (!logado) {
      return ehLogin
        ? null
        : `/${locale}/cliente/login?next=${encodeURIComponent(pathname + search)}`;
    }
    // Logado: login e area do lojista nao servem ao admin; lojista no login volta p/ home.
    if (ehLogin) return home;
    return papel === "admin" ? home : null;
  }

  if (area === "admin") {
    if (!logado) return `/${locale}/cliente/login`;
    return papel === "admin" ? null : `/${locale}/cliente`;
  }

  return null;
}
