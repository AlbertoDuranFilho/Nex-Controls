import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { textos } from "@/constants/textos";
import type { Database } from "@/types/database";

export type Papel = "visitante" | "lojista" | "admin";

export type Perfil = {
  papel: Papel;
  /** true só para lojista com cadastro ativo (mesma regra do RPC is_lojista_ativo do banco). */
  lojistaAtivo: boolean;
};

export const PERFIL_VISITANTE: Perfil = { papel: "visitante", lojistaAtivo: false };

/**
 * Descobre o papel do usuário com a sessão dele (RLS), espelhando o site:
 * - admin = app_metadata.papel "admin" E profiles.is_admin = true (o metadata sozinho não basta);
 * - qualquer outro usuário logado é lojista; ativo = rpc is_lojista_ativo().
 */
export async function resolverPerfil(
  cliente: SupabaseClient<Database>,
  sessao: Session | null,
): Promise<Perfil> {
  const usuario = sessao?.user;
  if (!usuario) return PERFIL_VISITANTE;

  if (usuario.app_metadata?.papel === "admin") {
    const { data } = await cliente
      .from("profiles")
      .select("is_admin")
      .eq("id", usuario.id)
      .maybeSingle();
    if (data?.is_admin === true) return { papel: "admin", lojistaAtivo: false };
  }

  const { data: ativo, error } = await cliente.rpc("is_lojista_ativo");
  return { papel: "lojista", lojistaAtivo: !error && ativo === true };
}

/** Traduz o erro do login do Supabase para uma frase amigável. */
export function mensagemErroLogin(erro: { message?: string; status?: number; code?: string }): string {
  const codigo = erro.code ?? "";
  const mensagem = (erro.message ?? "").toLowerCase();
  if (codigo === "invalid_credentials" || mensagem.includes("invalid login credentials")) {
    return textos.login.erroCredenciais;
  }
  if (codigo === "email_not_confirmed" || mensagem.includes("email not confirmed")) {
    return textos.login.erroEmailNaoConfirmado;
  }
  if (erro.status === 429 || codigo.includes("rate_limit") || codigo === "over_request_rate_limit") {
    return textos.login.erroMuitasTentativas;
  }
  if (mensagem.includes("network") || mensagem.includes("fetch")) {
    return textos.geral.semConexao;
  }
  // banido (anonimizado/desativado) e demais casos: mesma mensagem de credencial, sem expor detalhes
  if (codigo === "user_banned") return textos.login.erroCredenciais;
  return textos.geral.erroGenerico;
}
