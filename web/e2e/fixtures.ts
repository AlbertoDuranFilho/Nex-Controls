import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

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

type DadosLojista = { nome: string; ativo: boolean; desconto: number; endereco: boolean };

export const ENDERECO_TESTE = {
  cep: "01310100",
  logradouro: "Av. Paulista",
  numero: "1000",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
};

export async function criarLojista(dados: Partial<DadosLojista> = {}) {
  const { nome = "Loja Teste", ativo = true, desconto = 0, endereco = false } = dados;
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
    desconto_percentual: desconto,
    ...(endereco ? ENDERECO_TESTE : {}),
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
  // pedidos.lojista_id não tem cascade: os pedidos de teste saem antes dos lojistas.
  await sql(
    "delete from public.pedidos where lojista_id in (select id from public.lojistas where email like $1)",
    [`%@${DOMINIO}`],
  );
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

// O schema auth não é exposto pelo PostgREST: consultas diretas ao Postgres local
// (mesma URL no CI, onde o Supabase também roda local). Só para asserções de e2e.
const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function sql<T extends Record<string, unknown>>(texto: string, params: unknown[] = []) {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return (await c.query<T>(texto, params)).rows;
  } finally {
    await c.end();
  }
}

type DadosProduto = {
  codigo: string;
  nome: string;
  preco: number;
  manual_url?: string | null;
  especificacoes?: { nome: string; valor: string }[];
  ativo?: boolean;
};

// Grava via service role (RLS ignorada). O slug vem do trigger; lê de volta.
export async function criarProduto(dados: DadosProduto) {
  const db = admin();
  const { codigo, nome, preco, manual_url = null, especificacoes = [], ativo = true } = dados;
  const { data, error } = await db
    .from("produtos")
    .insert({ codigo, nome, manual_url, ativo, slug: "" })
    .select("id, slug")
    .single();
  if (error) throw error;
  const { error: e2 } = await db.from("produto_precos").insert({ produto_id: data.id, preco });
  if (e2) throw e2;
  if (especificacoes.length) {
    const { error: e3 } = await db
      .from("produto_especificacoes")
      .insert(especificacoes.map((e, ordem) => ({ ...e, ordem, produto_id: data.id })));
    if (e3) throw e3;
  }
  return { id: data.id, slug: data.slug };
}

export async function darDesconto(lojistaId: string, produtoId: string, pct: number) {
  const { error } = await admin()
    .from("lojista_descontos_produto")
    .insert({ lojista_id: lojistaId, produto_id: produtoId, desconto_percentual: pct });
  if (error) throw error;
}

export async function removerProdutos(codigos: string[]) {
  await admin().from("produtos").delete().in("codigo", codigos);
}

export async function colocarNoCarrinho(lojistaId: string, produtoId: string, quantidade: number) {
  const { error } = await admin()
    .from("carrinho_itens")
    .insert({ lojista_id: lojistaId, produto_id: produtoId, quantidade });
  if (error) throw error;
}

type DadosCupom = {
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  valor_minimo_pedido?: number | null;
};

// O código tem de chegar normalizado (check do banco): upper(trim()).
export async function criarCupom(dados: DadosCupom) {
  const { error } = await admin()
    .from("cupons")
    .insert({ ...dados, codigo: dados.codigo.trim().toUpperCase() });
  if (error) throw error;
}

export async function removerCupons(codigos: string[]) {
  await admin().from("cupons").delete().in("codigo", codigos);
}
