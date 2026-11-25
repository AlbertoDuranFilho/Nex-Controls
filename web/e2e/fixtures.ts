import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const DOMINIO = "e2e.nexcontrols.test";
export const SENHA_PADRAO = "Senha#Teste123";

export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function emailUnico(prefixo: string) {
  return `${prefixo}-${randomUUID()}@${DOMINIO}`;
}

function cnpjAleatorio() {
  return String(Math.floor(Math.random() * 1e14)).padStart(14, "0");
}

type DadosLojista = { nome: string; ativo: boolean };

export async function criarLojista(dados: Partial<DadosLojista> = {}) {
  const { nome = "Loja Teste", ativo = true } = dados;
  const db = admin();
  const email = emailUnico("lojista");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: SENHA_PADRAO,
    email_confirm: true,
    app_metadata: { nome, papel: "lojista" },
  });
  if (error) throw error;
  const id = data.user.id;
  const { error: e2 } = await db.from("lojistas").insert({
    id,
    tipo_pessoa: "PJ",
    documento: cnpjAleatorio(),
    nome,
    email,
    ativo,
  });
  if (e2) throw e2;
  return { id, email, senha: SENHA_PADRAO };
}

export async function criarAdmin() {
  const db = admin();
  const email = emailUnico("admin");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: SENHA_PADRAO,
    email_confirm: true,
    app_metadata: { nome: "Admin Teste", papel: "admin" },
  });
  if (error) throw error;
  const { error: e2 } = await db
    .from("profiles")
    .update({ nome: "Admin Teste", is_admin: true })
    .eq("id", data.user.id);
  if (e2) throw e2;
  return { id: data.user.id, email, senha: SENHA_PADRAO };
}

export async function limparUsuarios() {
  const db = admin();
  await db.from("lojistas").delete().like("email", `%@${DOMINIO}`);
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    if (u.email?.endsWith(`@${DOMINIO}`)) await db.auth.admin.deleteUser(u.id);
  }
}

export async function contarAcessos(userId: string) {
  const { data, error } = await admin().from("acessos_log").select("user_id").eq("user_id", userId);
  if (error) throw error;
  return data.length;
}
