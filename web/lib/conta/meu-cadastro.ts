import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MeuCadastro = Database["public"]["Tables"]["lojistas"]["Row"] & {
  emailPendente: string | null;
};

// Memoizado por requisição (layout + página). Sessão do próprio usuário: a RLS só devolve a linha dele.
export const buscarMeuCadastro = cache(async (): Promise<MeuCadastro | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("lojistas").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { ...data, email: user.email ?? data.email, emailPendente: user.new_email ?? null };
});

export async function obterMeuCadastro(): Promise<MeuCadastro> {
  const cadastro = await buscarMeuCadastro();
  if (!cadastro) throw new Error("Cadastro não encontrado.");
  return cadastro;
}
