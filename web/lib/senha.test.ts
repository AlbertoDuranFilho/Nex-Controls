import { describe, expect, it } from "vitest";
import { gerarSenhaProvisoria } from "@/lib/senha";

describe("gerarSenhaProvisoria", () => {
  it("gera 200 senhas válidas com 12 caracteres do alfabeto sem ambíguos", () => {
    for (let i = 0; i < 200; i++) {
      const s = gerarSenhaProvisoria();
      expect(s).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#$%*]{12}$/);
      expect(s).toMatch(/[A-Z]/);
      expect(s).toMatch(/[a-z]/);
      expect(s).toMatch(/\d/);
    }
  });

  it("não repete a mesma senha em lote", () => {
    const senhas = new Set(Array.from({ length: 50 }, () => gerarSenhaProvisoria()));
    expect(senhas.size).toBe(50);
  });
});
