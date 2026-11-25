import { describe, expect, it } from "vitest";
import { encontrarTodos, verificarProducao } from "./verificar-producao.mjs";

const envCompleto = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://nexcontrols.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};
const limpas = { pt: { a: { b: "ok" } }, en: { a: "ok" }, es: { a: ["ok"] } };
const OBRIGATORIAS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

describe("encontrarTodos", () => {
  it("acha marcadores em objetos e arrays aninhados", () => {
    expect(
      encontrarTodos({ footer: { cnpj: "CNPJ: TODO_CNPJ", ok: "x" }, l: ["a", "TODO_X"] }),
    ).toEqual(["footer.cnpj", "l[1]"]);
  });

  it("ignora strings sem o marcador e valores que não são texto", () => {
    expect(encontrarTodos({ a: "TODO sem underscore", b: 1, c: null })).toEqual([]);
  });
});

describe("verificarProducao", () => {
  it("fora de produção não reclama de nada", () => {
    const mensagens = { pt: { a: "TODO_X" } };
    expect(verificarProducao({ env: {}, mensagens })).toEqual([]);
    expect(verificarProducao({ env: { VERCEL_ENV: "preview" }, mensagens })).toEqual([]);
    expect(verificarProducao({ env: { VERCEL_ENV: "development" }, mensagens })).toEqual([]);
  });

  it("produção completa passa", () => {
    expect(verificarProducao({ env: envCompleto, mensagens: limpas })).toEqual([]);
  });

  it("produção com TODO_ nas mensagens falha e aponta o arquivo e a chave", () => {
    const problemas = verificarProducao({
      env: envCompleto,
      mensagens: { ...limpas, es: { footer: { address: "TODO_ENDERECO" } } },
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("messages/es.json");
    expect(problemas[0]).toContain("footer.address");
  });

  it.each(OBRIGATORIAS)("produção sem %s falha", (nome) => {
    const semVar = { ...envCompleto, [nome]: undefined };
    expect(verificarProducao({ env: semVar, mensagens: limpas })).toEqual([
      `Variável de ambiente ${nome} ausente ou vazia.`,
    ]);
    const vazia = { ...envCompleto, [nome]: "  " };
    expect(verificarProducao({ env: vazia, mensagens: limpas })).toHaveLength(1);
  });
});
