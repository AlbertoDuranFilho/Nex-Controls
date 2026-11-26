import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '../lib/supabase/middleware';
import { decidirRedirect, ehAreaProtegida } from '../lib/supabase/rotas';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { pathname, search } = request.nextUrl;

  // Paginas publicas nao precisam de getUser() (round-trip ao Supabase Auth);
  // tambem pula quando o next-intl ja redirecionou (ex.: / -> /pt).
  const ehRedirect = intlResponse.status >= 300 && intlResponse.status < 400;
  if (ehRedirect || !ehAreaProtegida(pathname)) return intlResponse;

  const { response, user, papel } = await updateSession(request, intlResponse);
  const destino = decidirRedirect(pathname, search, { logado: !!user, papel });
  if (!destino) return response;

  const redirect = NextResponse.redirect(new URL(destino, request.url));
  // Preserva cookies de sessao renovados pelo Supabase.
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next|_vercel|.*\\..*).*)'
  ]
};
