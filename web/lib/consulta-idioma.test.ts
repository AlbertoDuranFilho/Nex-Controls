import { describe, expect, it } from "vitest";
import { consultaNoIdioma } from "./consulta-idioma";

describe("consultaNoIdioma", () => {
  it("mantém o next trocando o idioma dele", () => {
    expect(consultaNoIdioma("?next=%2Fpt%2Fcatalogo", "pt", "en")).toBe("?next=%2Fen%2Fcatalogo");
    expect(consultaNoIdioma("?next=%2Fpt", "pt", "es")).toBe("?next=%2Fes");
  });

  it("next de outro caminho e outros parâmetros ficam como estão", () => {
    expect(consultaNoIdioma("?next=%2Fptx&a=1", "pt", "en")).toBe("?next=%2Fptx&a=1");
    expect(consultaNoIdioma("", "pt", "en")).toBe("");
  });
});
