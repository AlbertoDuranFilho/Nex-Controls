import "server-only";
import { cache } from "react";
import { getUsuarioAtual } from "@/lib/auth/usuario-atual";
import { createClient } from "@/lib/supabase/server";

// Admin de verdade = papel "admin" no app_metadata E profiles.is_admin = true no banco.
// O app_metadata sozinho nunca basta. Memoizado por requisição (layout + página + ação).
const verificar = cache(async (): Promise<string | null> => {
  const usuario = await getUsuarioAtual();
  if (usuario?.papel !== "admin") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", usuario.id)
    .maybeSingle();
  return data?.is_admin === true ? usuario.id : null;
});

export async function ehAdmin(): Promise<boolean> {
  return (await verificar()) !== null;
}

export async function exigirAdmin(): Promise<{ id: string }> {
  const id = await verificar();
  if (!id) throw new Error("Acesso negado.");
  return { id };
}
