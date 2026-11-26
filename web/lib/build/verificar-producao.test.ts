import { describe, expect, it } from "vitest";
import { encontrarTodos, verificarProducao } from "./verificar-producao.mjs";

const envCompleto = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://nexcontrols.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  RESEND_API_KEY: "re_x",
  CLOUDINARY_CLOUD_NAME: "nex",
  CLOUDINARY_API_KEY: "k",
  CLOUDINARY_API_SECRET: "s",
};
const limpas = { pt: { a: { b: "ok" } }, en: { a: "ok" }, es: { a: ["ok"] } };
const OBRIGATORIAS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
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

  describe("credenciais da Mainô com NF-e automática", () => {
    const NFE = ["MAINO_APPLICATION_UID", "MAINO_EMAIL", "MAINO_SENHA"];
    const credenciais = { MAINO_APPLICATION_UID: "uid", MAINO_EMAIL: "a@b.com", MAINO_SENHA: "x" };

    it("com a flag e as três credenciais, passa", () => {
      const env = { ...envCompleto, FEATURE_NFE_AUTOMATICA: "true", ...credenciais };
      expect(verificarProducao({ env, mensagens: limpas })).toEqual([]);
    });
    it.each(NFE)("com a flag e sem %s, falha", (nome) => {
      const base = { ...envCompleto, FEATURE_NFE_AUTOMATICA: "true", ...credenciais };
      const problemas = verificarProducao({ env: { ...base, [nome]: undefined }, mensagens: limpas });
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toContain(nome);
      expect(verificarProducao({ env: { ...base, [nome]: "  " }, mensagens: limpas })).toHaveLength(1);
    });
    it("sem a flag, não cobra as credenciais", () => {
      expect(verificarProducao({ env: envCompleto, mensagens: limpas })).toEqual([]);
      expect(
        verificarProducao({ env: { ...envCompleto, FEATURE_NFE_AUTOMATICA: "false" }, mensagens: limpas }),
      ).toEqual([]);
    });
    it("fora de produção não cobra", () => {
      const env = { VERCEL_ENV: "preview", FEATURE_NFE_AUTOMATICA: "true" };
      expect(verificarProducao({ env, mensagens: limpas })).toEqual([]);
    });
  });

  describe("endereço com pagamento online", () => {
    const decreto =
      "Endereço físico da empresa (footer.address) é obrigatório com pagamento online (Decreto 7.962/2013).";
    const env = { ...envCompleto, FEATURE_PAGAMENTO_ONLINE: "true" };

    it("com a flag e sem footer.address, reclama", () => {
      expect(verificarProducao({ env, mensagens: { ...limpas, pt: { footer: {} } } })).toContain(decreto);
      expect(
        verificarProducao({ env, mensagens: { ...limpas, pt: { footer: { address: " " } } } }),
      ).toContain(decreto);
    });
    it("com a flag e endereço preenchido, passa", () => {
      expect(
        verificarProducao({ env, mensagens: { ...limpas, pt: { footer: { address: "Rua X, 1" } } } }),
      ).toEqual([]);
    });
    it("sem a flag, não cobra o endereço", () => {
      expect(
        verificarProducao({ env: envCompleto, mensagens: { ...limpas, pt: { footer: {} } } }),
      ).not.toContain(decreto);
    });
  });
});
