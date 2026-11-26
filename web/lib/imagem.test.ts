import { describe, expect, it } from "vitest";
import { imagemNaoOtimizada } from "./imagem";

describe("imagemNaoOtimizada", () => {
  it("otimiza só res.cloudinary.com", () => {
    expect(imagemNaoOtimizada("https://res.cloudinary.com/x/image/upload/a.png")).toBe(false);
    expect(imagemNaoOtimizada("https://outro.com/a.png")).toBe(true);
    expect(imagemNaoOtimizada("https://res.cloudinary.com.evil.com/a.png")).toBe(true);
    expect(imagemNaoOtimizada("não é url")).toBe(true);
  });
});
