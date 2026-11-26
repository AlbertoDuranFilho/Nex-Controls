import { describe, expect, it } from "vitest";
import { ehRotaAdmin, itemAdminAtivo, semTopoDoSite } from "./rota";

describe("ehRotaAdmin", () => {
  it.each(["/pt/admin", "/pt/admin/", "/en/admin/produtos", "/es/admin/produtos/123"])("%s é admin", (p) => {
    expect(ehRotaAdmin(p)).toBe(true);
  });

  it.each(["/pt", "/pt/administracao", "/pt/catalogo/admin", "/admin", "/pt/cliente"])("%s não é admin", (p) => {
    expect(ehRotaAdmin(p)).toBe(false);
  });
});

describe("itemAdminAtivo", () => {
  it("subpágina ativa o item", () => {
    expect(itemAdminAtivo("/pt/admin/produtos/123", "/pt/admin/produtos", false)).toBe(true);
    expect(itemAdminAtivo("/pt/admin/produtos", "/pt/admin/produtos", false)).toBe(true);
    expect(itemAdminAtivo("/pt/admin/produtosx", "/pt/admin/produtos", false)).toBe(false);
  });

  it("Início só exato", () => {
    expect(itemAdminAtivo("/pt/admin", "/pt/admin", true)).toBe(true);
    expect(itemAdminAtivo("/pt/admin/produtos", "/pt/admin", true)).toBe(false);
  });
});

describe("semTopoDoSite", () => {
  it.each(["/pt/admin", "/pt/admin/pedidos/1", "/pt/cliente/login", "/en/cliente/login/"])("%s esconde o topo", (p) => {
    expect(semTopoDoSite(p)).toBe(true);
  });

  it.each(["/pt", "/pt/cliente", "/pt/cliente/pedidos", "/pt/cliente/loginx", "/pt/catalogo"])("%s mostra o topo", (p) => {
    expect(semTopoDoSite(p)).toBe(false);
  });
});
