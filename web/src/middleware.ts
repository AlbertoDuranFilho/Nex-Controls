import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '../lib/supabase/middleware';
import { decidirRedirect } from '../lib/supabase/rotas';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { response, user, papel } = await updateSession(request, intlResponse);

  const { pathname, search } = request.nextUrl;
  const destino = decidirRedirect(pathname, search, { logado: !!user, papel });
  if (!destino) return response;

  const redirect = NextResponse.redirect(new URL(destino, request.url));
  // Preserva cookies de sessao renovados pelo Supabase.
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
