import { describe, expect, it } from "vitest";
import { decidirRedirect } from "./rotas";

const anon = { logado: false, papel: null } as const;
const lojista = { logado: true, papel: "lojista" } as const;
const admin = { logado: true, papel: "admin" } as const;

describe("decidirRedirect", () => {
  it("sem user em /pt/cliente vai para login com next", () => {
    expect(decidirRedirect("/pt/cliente", "", anon)).toBe(
      "/pt/cliente/login?next=%2Fpt%2Fcliente",
    );
  });

  it("next preserva pathname completo e search", () => {
    expect(decidirRedirect("/es/cliente/pedidos", "?a=1", anon)).toBe(
      "/es/cliente/login?next=%2Fes%2Fcliente%2Fpedidos%3Fa%3D1",
    );
  });

  it("sem user em /pt/cliente/login nao redireciona", () => {
    expect(decidirRedirect("/pt/cliente/login", "", anon)).toBeNull();
  });

  it("sem user em /en/admin/lojistas vai para login sem next", () => {
    expect(decidirRedirect("/en/admin/lojistas", "", anon)).toBe("/en/cliente/login");
  });

  it("lojista em /es/admin/x vai para /es/cliente", () => {
    expect(decidirRedirect("/es/admin/x", "", lojista)).toBe("/es/cliente");
  });

  it("admin em /pt/cliente vai para /pt/admin/lojistas", () => {
    expect(decidirRedirect("/pt/cliente", "", admin)).toBe("/pt/admin/lojistas");
    expect(decidirRedirect("/pt/cliente/pedidos", "", admin)).toBe("/pt/admin/lojistas");
  });

  it("admin em /pt/cliente/login vai para /pt/admin/lojistas", () => {
    expect(decidirRedirect("/pt/cliente/login", "", admin)).toBe("/pt/admin/lojistas");
  });

  it("lojista em /pt/cliente/login vai para /pt/cliente", () => {
    expect(decidirRedirect("/pt/cliente/login", "", lojista)).toBe("/pt/cliente");
  });

  it("lojista e admin em suas areas nao redirecionam", () => {
    expect(decidirRedirect("/pt/cliente/pedidos", "", lojista)).toBeNull();
    expect(decidirRedirect("/pt/admin/lojistas", "", admin)).toBeNull();
  });

  it("paginas publicas nao redirecionam", () => {
    expect(decidirRedirect("/pt", "", anon)).toBeNull();
    expect(decidirRedirect("/pt/catalogo/1", "", anon)).toBeNull();
    expect(decidirRedirect("/pt/catalogo/1", "", admin)).toBeNull();
    expect(decidirRedirect("/pt/clientela", "", anon)).toBeNull();
  });

  it("locale desconhecido nao redireciona", () => {
    expect(decidirRedirect("/fr/cliente", "", anon)).toBeNull();
  });
});
