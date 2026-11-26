import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { textos } from "@/constants/textos";
import type { Database } from "@/types/database";
import { armazenamentoSeguro } from "./armazenamento";

// Só chaves públicas aqui (URL + publishable/anon). Nunca a service role: tudo
// passa pelo RLS com a sessão do próprio usuário, igual ao site.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !chave) {
  throw new Error(textos.configuracao.faltaAmbiente);
}

/** Origem do site (sem barra final), para a rota de notificar pedido e links. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://www.nexcontrols.com").replace(
  /\/+$/,
  "",
);

export const supabase = createClient<Database>(url, chave, {
  auth: {
    storage: armazenamentoSeguro,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// No app nativo não há "aba visível": o refresh automático segue o estado do app.
// Ao voltar para o primeiro plano, o supabase-js renova o token se tiver expirado;
// se o refresh falhar, ele emite SIGNED_OUT e o contexto de sessão volta a visitante.
AppState.addEventListener("change", (estado) => {
  if (estado === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
