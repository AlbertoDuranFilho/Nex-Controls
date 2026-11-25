import type { NextRequest, NextResponse } from "next/server";

/**
 * Torna os cookies atualizados em `request.cookies` visiveis ao request que
 * segue para as rotas/Server Components. `request.cookies.set` sozinho nao
 * basta: a resposta do next-intl ja foi montada. O Next le os headers
 * `x-middleware-override-headers` (lista completa de headers do request) e
 * `x-middleware-request-<nome>` (valor) da resposta; e o que
 * `NextResponse.next({ request })` faz. Aqui editamos a resposta existente
 * para preservar rewrites, headers e cookies do next-intl.
 */
export function propagarCookiesParaRequest(request: NextRequest, response: NextResponse) {
  const overrides = response.headers.get("x-middleware-override-headers");
  const nomes = new Set(
    overrides ? overrides.split(",") : Array.from(request.headers.keys()),
  );
  if (!overrides) {
    request.headers.forEach((valor, nome) =>
      response.headers.set(`x-middleware-request-${nome}`, valor),
    );
  }
  nomes.add("cookie");
  response.headers.set("x-middleware-override-headers", Array.from(nomes).join(","));
  response.headers.set(
    "x-middleware-request-cookie",
    request.cookies
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
}
