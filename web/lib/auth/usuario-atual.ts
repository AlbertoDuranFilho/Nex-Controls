import "server-only";
import { createClient } from "@/lib/supabase/server";

export type UsuarioAtual = {
  id: string;
  email: string;
  papel: "admin" | "lojista";
  nome: string;
};

export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = user.app_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    papel: meta.papel === "admin" ? "admin" : "lojista",
    nome: typeof meta.nome === "string" ? meta.nome : "",
  };
}
