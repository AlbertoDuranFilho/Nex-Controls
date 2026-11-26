// Regras do guard de build de produção (usado por scripts/verificar-producao.mjs).
// Funções puras: recebem env e mensagens, devolvem a lista de problemas.

export const VARIAVEIS_OBRIGATORIAS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// Exigidas em produção quando FEATURE_NFE_AUTOMATICA=true.
export const VARIAVEIS_NFE = ["MAINO_APPLICATION_UID", "MAINO_EMAIL", "MAINO_SENHA"];

/**
 * Caminhos (ex.: "footer.cnpj") das strings que contêm o marcador TODO_.
 * @param {unknown} valor
 * @param {string} [prefixo]
 * @returns {string[]}
 */
export function encontrarTodos(valor, prefixo = "") {
  if (typeof valor === "string") return valor.includes("TODO_") ? [prefixo] : [];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => encontrarTodos(v, `${prefixo}[${i}]`));
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([k, v]) =>
      encontrarTodos(v, prefixo ? `${prefixo}.${k}` : k),
    );
  }
  return [];
}

/**
 * Problemas que impedem o build de produção. Fora de VERCEL_ENV=production, sempre vazio.
 * @param {{ env: Record<string, string | undefined>, mensagens: Record<string, unknown> }} entrada
 * @returns {string[]}
 */
export function verificarProducao({ env, mensagens }) {
  if (env.VERCEL_ENV !== "production") return [];
  /** @type {string[]} */
  const problemas = [];
  for (const [idioma, conteudo] of Object.entries(mensagens)) {
    for (const caminho of encontrarTodos(conteudo)) {
      problemas.push(`messages/${idioma}.json: "${caminho}" ainda contém um marcador TODO_.`);
    }
  }
  for (const nome of VARIAVEIS_OBRIGATORIAS) {
    if (!env[nome]?.trim()) problemas.push(`Variável de ambiente ${nome} ausente ou vazia.`);
  }
  if (env.FEATURE_PAGAMENTO_ONLINE === "true") {
    const pt = /** @type {any} */ (mensagens.pt);
    const endereco = pt?.footer?.address;
    if (typeof endereco !== "string" || !endereco.trim()) {
      problemas.push(
        "Endereço físico da empresa (footer.address) é obrigatório com pagamento online (Decreto 7.962/2013).",
      );
    }
  }
  if (env.FEATURE_NFE_AUTOMATICA === "true") {
    for (const nome of VARIAVEIS_NFE) {
      if (!env[nome]?.trim()) {
        problemas.push(`Variável de ambiente ${nome} ausente ou vazia (obrigatória com NF-e automática).`);
      }
    }
  }
  return problemas;
}
