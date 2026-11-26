import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import {
  colocarNoCarrinho,
  criarLojista,
  criarProduto,
  limparUsuarios,
  removerProdutos,
  sql,
} from "./fixtures";

const sufixo = randomUUID().slice(0, 6).toUpperCase();
const codigo = `APN${sufixo}`;

test.afterAll(async () => {
  await limparUsuarios();
  await removerProdutos([codigo]);
});

async function entrar(u: { email: string; senha: string }) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await c.auth.signInWithPassword({ email: u.email, password: u.senha });
  if (error) throw error;
  return { cliente: c, token: data.session!.access_token };
}

test("rota do app: recusa sem token e pedido alheio; dono recebe 200", async ({ request }) => {
  await criarProduto({ codigo, nome: `Placa App ${sufixo}`, preco: 100 });
  const dono = await criarLojista({ endereco: true });
  const outro = await criarLojista({ endereco: true });
  const produto = await sql<{ id: string }>("select id from public.produtos where codigo = $1", [codigo]);
  await colocarNoCarrinho(dono.id, produto[0].id, 1);
  const a = await entrar(dono);
  const { error } = await a.cliente.rpc("criar_pedido", {});
  if (error) throw error;
  const [{ id }] = await sql<{ id: string }>("select id from public.pedidos where lojista_id = $1", [dono.id]);
  const url = `/api/app/pedidos/${id}/notificar`;

  expect((await request.post(url)).status()).toBe(401);
  expect((await request.post(url, { headers: { authorization: "Bearer lixo" } })).status()).toBe(401);

  const b = await entrar(outro);
  expect((await request.post(url, { headers: { authorization: `Bearer ${b.token}` } })).status()).toBe(404);

  const ok = await request.post(url, { headers: { authorization: `Bearer ${a.token}` } });
  expect(ok.status()).toBe(200);
  expect(typeof (await ok.json()).enviado).toBe("boolean");
});
