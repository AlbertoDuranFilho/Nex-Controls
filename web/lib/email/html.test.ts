import { describe, expect, it } from "vitest";
import { escaparHtml } from "./html";

describe("escaparHtml", () => {
  it("escapa tags e aspas", () => {
    expect(escaparHtml('<img src=x onerror="a">')).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;");
  });
  it("escapa & e apostrofo", () => {
    expect(escaparHtml("a & b's")).toBe("a &amp; b&#39;s");
  });
});
