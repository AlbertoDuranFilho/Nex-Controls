// Guard de build (roda como `prebuild`): com VERCEL_ENV=production, falha (exit 1)
// se alguma mensagem ainda tiver placeholder TODO_ ou faltar variável obrigatória.
// Em qualquer outro caso sai 0 em silêncio. Nunca imprime valores, só nomes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { verificarProducao } from "../lib/build/verificar-producao.mjs";

if (process.env.VERCEL_ENV === "production") {
  // Mesmas fontes que o `next build` usa (.env.production*, .env.local, .env).
  nextEnv.loadEnvConfig(process.cwd());
  const mensagens = Object.fromEntries(
    ["pt", "en", "es"].map((idioma) => [
      idioma,
      JSON.parse(readFileSync(join(process.cwd(), "messages", `${idioma}.json`), "utf8")),
    ]),
  );
  const problemas = verificarProducao({ env: process.env, mensagens });
  if (problemas.length > 0) {
    console.error("verificar-producao: build de PRODUÇÃO bloqueado. Corrija antes de publicar:");
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
}
