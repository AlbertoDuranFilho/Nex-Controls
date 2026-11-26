import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { decidirRedirect, ehAreaProtegida } from "./rotas";
import { propagarCookiesParaRequest } from "./cookies";

describe("ehAreaProtegida", () => {
  it.each(["/pt/cliente", "/pt/cliente/login", "/en/admin", "/es/admin/lojistas/1"])(
    "%s e protegida",
    (p) => expect(ehAreaProtegida(p)).toBe(true),
  );
  it.each(["/pt", "/pt/catalogo/1", "/pt/clientela", "/fr/cliente", "/pt/privacy-policy"])(
    "%s e publica",
    (p) => expect(ehAreaProtegida(p)).toBe(false),
  );
});

describe("propagarCookiesParaRequest", () => {
  it("expoe cookies renovados ao request downstream preservando overrides do next-intl", () => {
    const req = new NextRequest("http://localhost/pt/cliente", {
      headers: { cookie: "sb=velho; outro=1", "x-a": "1" },
    });
    const res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
    req.cookies.set("sb", "novo");
    propagarCookiesParaRequest(req, res);
    expect(res.headers.get("x-middleware-request-cookie")).toBe("sb=novo; outro=1");
    expect(res.headers.get("x-middleware-override-headers")?.split(",")).toContain("cookie");
    expect(res.headers.get("x-middleware-request-x-a")).toBe("1");
  });

  it("cria a lista de overrides quando a resposta nao tem", () => {
    const req = new NextRequest("http://localhost/pt/cliente", {
      headers: { cookie: "sb=velho", "x-a": "1" },
    });
    const res = NextResponse.next();
    req.cookies.set("sb", "novo");
    propagarCookiesParaRequest(req, res);
    expect(res.headers.get("x-middleware-request-cookie")).toBe("sb=novo");
    expect(res.headers.get("x-middleware-request-x-a")).toBe("1");
    expect(res.headers.get("x-middleware-override-headers")?.split(",")).toEqual(
      expect.arrayContaining(["cookie", "x-a"]),
    );
  });
});

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
