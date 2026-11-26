import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TextoProduto from "./TextoProduto";

const html = (texto: string | null) => renderToStaticMarkup(<TextoProduto texto={texto} />);

describe("TextoProduto", () => {
  it("separa parágrafos por linha em branco", () => {
    expect(html("a\n\nb").match(/<p/g)).toHaveLength(2);
  });

  it("bloco com todas as linhas '- ' vira lista", () => {
    const out = html("- x\n- y");
    expect(out).toContain("<ul");
    expect(out.match(/<li/g)).toHaveLength(2);
    expect(out).not.toContain("<p");
  });

  it("não interpreta HTML", () => {
    const out = html("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toContain("<script>");
  });

  it("texto nulo ou vazio não renderiza nada", () => {
    expect(html(null)).toBe("");
    expect(html("  \n\n ")).toBe("");
  });
});
