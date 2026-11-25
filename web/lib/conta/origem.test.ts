import { describe, expect, it } from "vitest";
import { resolverOrigem } from "./origem";

describe("resolverOrigem", () => {
  it("usa só NEXT_PUBLIC_SITE_URL quando definida", () => {
    expect(
      resolverOrigem({ siteUrl: "https://loja.exemplo.com/", producao: true, host: "evil.com" }),
    ).toBe("https://loja.exemplo.com");
    expect(
      resolverOrigem({ siteUrl: "http://localhost:3000", producao: false, host: "evil.com" }),
    ).toBe("http://localhost:3000");
  });
  it("siteUrl malformada não cai nos headers", () => {
    expect(resolverOrigem({ siteUrl: "loja sem esquema", producao: false, host: "a.com" })).toBeNull();
  });
  it("produção sem env não usa headers", () => {
    expect(resolverOrigem({ producao: true, host: "loja.exemplo.com", proto: "https" })).toBeNull();
  });
  it("dev com host válido usa o header", () => {
    expect(resolverOrigem({ producao: false, host: "localhost:3000" })).toBe("http://localhost:3000");
    expect(resolverOrigem({ producao: false, host: "app.test", proto: "https" })).toBe("https://app.test");
  });
  it("host inválido ou ausente resulta em null", () => {
    expect(resolverOrigem({ producao: false, host: "a.com/evil" })).toBeNull();
    expect(resolverOrigem({ producao: false, host: "a b" })).toBeNull();
    expect(resolverOrigem({ producao: false, host: null })).toBeNull();
  });
});
