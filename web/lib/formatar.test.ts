import { describe, expect, it } from "vitest";
import { formatarMoeda } from "./formatar";

describe("formatarMoeda", () => {
  it("formata em BRL", () => {
    expect(formatarMoeda(1234.5, "pt").replace(/\s/g, " ")).toBe("R$ 1.234,50");
  });
  it("mantém BRL em outros idiomas", () => {
    expect(formatarMoeda(10, "en")).toContain("R$");
  });
});
