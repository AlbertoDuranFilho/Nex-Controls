// O painel admin tem shell próprio: o topo e o rodapé do site somem em /{locale}/admin(/...).
export function ehRotaAdmin(pathname: string): boolean {
  return /^\/[^/]+\/admin(\/|$)/.test(pathname);
}

// Telas sem o topo, o rodapé e o aviso de cookies do site: o painel admin e o login
// (o login já tem logo e "Voltar ao site").
export function semTopoDoSite(pathname: string): boolean {
  return ehRotaAdmin(pathname) || /^\/[^/]+\/cliente\/login\/?$/.test(pathname);
}

// Item do menu admin ativo: a própria página ou qualquer subpágina (/admin/produtos/123 → Produtos).
// A raiz (/admin, Início) só é ativa quando exata.
export function itemAdminAtivo(pathname: string, href: string, raiz: boolean): boolean {
  if (pathname === href) return true;
  return !raiz && pathname.startsWith(`${href}/`);
}
