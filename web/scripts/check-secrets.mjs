// Falha (exit 1) se a SUPABASE_SERVICE_ROLE_KEY aparecer no bundle do cliente
// (.next/static) ou no HTML pre-renderizado (.next/server/app/**/*.html).
// Nunca imprime o valor da chave, apenas o caminho dos arquivos afetados.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("check-secrets: SUPABASE_SERVICE_ROLE_KEY vazia ou ausente; nada a verificar.");
  process.exit(1);
}

const nextDir = resolve(process.cwd(), ".next");
if (!existsSync(nextDir)) {
  console.error("check-secrets: pasta .next nao encontrada; rode o build antes.");
  process.exit(1);
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const alvos = [
  ...walk(join(nextDir, "static")),
  ...[...walk(join(nextDir, "server", "app"))].filter((f) => f.endsWith(".html")),
];

const vazados = alvos.filter((f) => readFileSync(f, "utf8").includes(key));
if (vazados.length > 0) {
  console.error("check-secrets: SERVICE_ROLE_KEY encontrada em:");
  for (const f of vazados) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`check-secrets: OK (${alvos.length} arquivos verificados).`);
