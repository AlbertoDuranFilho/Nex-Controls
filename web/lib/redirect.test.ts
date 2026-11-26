import { describe, expect, it } from "vitest";
import { destinoSeguro } from "@/lib/redirect";

describe("destinoSeguro", () => {
  it("aceita caminho interno do mesmo locale", () => {
    expect(destinoSeguro("/pt/cliente/endereco", "pt")).toBe("/pt/cliente/endereco");
  });

  it("sem destino, o padrão é o catálogo do próprio locale", () => {
    expect(destinoSeguro(null, "en")).toBe("/en/catalogo");
    expect(destinoSeguro("", "es")).toBe("/es/catalogo");
  });

  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "/pt//evil.com",
    "/en/cliente",
    "javascript:alert(1)",
    null,
    undefined,
    "",
  ])("cai no padrão para entrada %j", (mal) => {
    expect(destinoSeguro(mal, "pt")).toBe("/pt/catalogo");
  });
});
