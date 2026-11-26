import { describe, expect, it } from "vitest";
import { permitirEnvio } from "./limite";

describe("permitirEnvio", () => {
  it("permite 5 por hora e bloqueia a 6ª; libera após a janela", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(permitirEnvio("ip-a", t)).toBe(true);
    expect(permitirEnvio("ip-a", t)).toBe(false);
    expect(permitirEnvio("ip-b", t)).toBe(true);
    expect(permitirEnvio("ip-a", t + 3_600_001)).toBe(true);
  });
});
