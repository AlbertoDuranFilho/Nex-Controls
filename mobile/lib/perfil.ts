import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { textos } from "@/constants/textos";
import type { Database } from "@/types/database";

/**
 * "erro": há sessão, mas não deu para confirmar papel/cadastro (rede, RLS…).
 * Nunca vira resposta: as telas mostram "Não foi possível carregar seus dados" + "Tentar de novo".
 */
export type Papel = "visitante" | "lojista" | "admin" | "erro";

export type Perfil = {
  papel: Papel;
  /** true só para lojista com cadastro ativo (mesma regra do RPC is_lojista_ativo do banco). */
  lojistaAtivo: boolean;
};

export const PERFIL_VISITANTE: Perfil = { papel: "visitante", lojistaAtivo: false };
export const PERFIL_ERRO: Perfil = { papel: "erro", lojistaAtivo: false };
const PERFIL_ADMIN: Perfil = { papel: "admin", lojistaAtivo: false };

/**
 * Descobre o papel do usuário com a sessão dele (RLS), espelhando o site:
 * - admin = app_metadata.papel "admin" E profiles.is_admin = true (o metadata sozinho não basta);
 * - qualquer outro usuário logado é lojista; ativo = rpc is_lojista_ativo().
 * Falhas não viram resposta: metadata admin + erro ao ler profiles => trata como admin (fecha:
 * o app desconecta); erro no is_lojista_ativo => "erro" (não "inativo").
 */
export async function resolverPerfil(
  cliente: SupabaseClient<Database>,
  sessao: Session | null,
): Promise<Perfil> {
  const usuario = sessao?.user;
  if (!usuario) return PERFIL_VISITANTE;

  if (usuario.app_metadata?.papel === "admin") {
    try {
      const { data, error } = await cliente
        .from("profiles")
        .select("is_admin")
        .eq("id", usuario.id)
        .maybeSingle();
      if (error || data?.is_admin === true) return PERFIL_ADMIN;
    } catch {
      return PERFIL_ADMIN;
    }
  }

  try {
    const { data: ativo, error } = await cliente.rpc("is_lojista_ativo");
    if (error || typeof ativo !== "boolean") return PERFIL_ERRO;
    return { papel: "lojista", lojistaAtivo: ativo };
  } catch {
    return PERFIL_ERRO;
  }
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
