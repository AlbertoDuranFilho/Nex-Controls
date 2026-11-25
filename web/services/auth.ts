"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { destinoSeguro } from "@/lib/redirect";

export type EstadoLogin = { erro: string | null };

export type UsuarioAtual = {
  id: string;
  email: string;
  papel: "admin" | "lojista";
  nome: string;
};

const LOCALES = ["pt", "en", "es"];

function localeValido(l: FormDataEntryValue | null): string {
  return typeof l === "string" && LOCALES.includes(l) ? l : "pt";
}

export async function entrar(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const locale = localeValido(form.get("locale"));
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const next = form.get("next");
  const t = await getTranslations({ locale, namespace: "login" });
  const erroGenerico = { erro: t("erroCredenciais") };

  if (!email || !senha) return erroGenerico;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return erroGenerico;

  await registrarAcesso(data.user.id);

  if (data.user.app_metadata?.papel === "admin") redirect(`/${locale}/admin/lojistas`);
  redirect(destinoSeguro(typeof next === "string" ? next : null, locale));
}

// Marco Civil art. 15: falha ao gravar o log nao pode bloquear o login.
async function registrarAcesso(userId: string) {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const { error } = await createAdminClient().from("acessos_log").insert({
      user_id: userId,
      ip,
      user_agent: h.get("user-agent"),
    });
    if (error) console.error("Falha ao gravar acessos_log:", error.message);
  } catch (e) {
    console.error("Falha ao gravar acessos_log:", e);
  }
}

export async function sair(locale: string): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${localeValido(locale)}`);
}

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
