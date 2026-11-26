// O painel admin tem shell próprio: o topo e o rodapé do site somem em /{locale}/admin(/...).
export function ehRotaAdmin(pathname: string): boolean {
  return /^\/[^/]+\/admin(\/|$)/.test(pathname);
}

// Item do menu admin ativo: a própria página ou qualquer subpágina (/admin/produtos/123 → Produtos).
// A raiz (/admin, Início) só é ativa quando exata.
export function itemAdminAtivo(pathname: string, href: string, raiz: boolean): boolean {
  if (pathname === href) return true;
  return !raiz && pathname.startsWith(`${href}/`);
}
