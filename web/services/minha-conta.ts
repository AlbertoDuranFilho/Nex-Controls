"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth/usuario-atual";
import { flags } from "@/lib/flags";
import { normalizarEmail } from "@/lib/admin/formulario";
import { normalizarCep } from "@/lib/validacao/cep";
import { validarTelefone } from "@/lib/validacao/telefone";
import { resolverOrigem } from "@/lib/conta/origem";
import { indicadorValido, lerCampos, localeValido, ufValida } from "@/lib/conta/campos";

export type EstadoForm = {
  status: "idle" | "ok" | "erro";
  mensagem?: string;
  erros?: Record<string, string>;
};

type Tradutor = Awaited<ReturnType<typeof tradutor>>;

async function tradutor(locale: string) {
  return getTranslations({ locale, namespace: "conta.erros" });
}

function erroCampos(t: Tradutor, erros: Record<string, string>): EstadoForm {
  return { status: "erro", mensagem: t("revise"), erros };
}

// Marca os problemas de tipo/tamanho de leitura como erro de campo.
function errosDeLeitura(t: Tradutor, problemas: Partial<Record<string, "tipo" | "longo">>) {
  const erros: Record<string, string> = {};
  for (const [campo, p] of Object.entries(problemas)) erros[campo] = p === "longo" ? t("longo") : t("invalido");
  return erros;
}

// Usuário logado como lojista (admin não edita cadastro por aqui). O id vem da sessão, nunca do form.
async function lojistaAtual() {
  const usuario = await getUsuarioAtual();
  return usuario && usuario.papel === "lojista" ? usuario : null;
}

export async function salvarMeusDados(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const locale = localeValido(form.get("locale"));
  const t = await tradutor(locale);
  const usuario = await lojistaAtual();
  if (!usuario) return { status: "erro", mensagem: t("sessao") };

  const { valores: v, problemas } = lerCampos(form, {
    nome_fantasia: 120,
    responsavel_nome: 120,
    telefone: 20,
    whatsapp: 20,
    inscricao_estadual: 30,
    indicador_ie: 20,
  });
  const erros = errosDeLeitura(t, problemas);

  let telefone: string | null = null;
  if (v.telefone) {
    telefone = validarTelefone(v.telefone);
    if (!telefone && !erros.telefone) erros.telefone = t("telefone");
  }
  let whatsapp: string | null = null;
  if (v.whatsapp) {
    whatsapp = validarTelefone(v.whatsapp);
    if (!whatsapp && !erros.whatsapp) erros.whatsapp = t("telefone");
  }
  if (!indicadorValido(v.indicador_ie)) {
    erros.indicador_ie = t("invalido");
  } else if (v.indicador_ie === "contribuinte" && !v.inscricao_estadual && !erros.inscricao_estadual) {
    erros.inscricao_estadual = t("ieObrigatoria");
  }
  if (Object.keys(erros).length > 0) return erroCampos(t, erros);

  const contribuinte = v.indicador_ie === "contribuinte";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lojistas")
    .update({
      nome_fantasia: v.nome_fantasia || null,
      responsavel_nome: v.responsavel_nome || null,
      telefone,
      whatsapp,
      indicador_ie: v.indicador_ie as "contribuinte" | "isento" | "nao_contribuinte",
      inscricao_estadual: contribuinte ? v.inscricao_estadual : null,
    })
    .eq("id", usuario.id)
    .select("id");
  if (error || !data || data.length === 0) return { status: "erro", mensagem: t("salvar") };

  revalidatePath(`/${locale}/cliente`);
  return { status: "ok" };
}

export async function salvarEndereco(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const locale = localeValido(form.get("locale"));
  const t = await tradutor(locale);
  const usuario = await lojistaAtual();
  if (!usuario) return { status: "erro", mensagem: t("sessao") };

  const { valores: v, problemas } = lerCampos(form, {
    cep: 12,
    logradouro: 150,
    numero: 20,
    complemento: 80,
    bairro: 80,
    cidade: 80,
    uf: 2,
  });
  const erros = errosDeLeitura(t, problemas);

  const cep = normalizarCep(v.cep);
  if (!cep && !erros.cep) erros.cep = t("cep");
  for (const campo of ["logradouro", "numero", "bairro", "cidade"] as const) {
    if (!v[campo] && !erros[campo]) erros[campo] = t("obrigatorio");
  }
  if (!ufValida(v.uf)) erros.uf = t("uf");
  if (Object.keys(erros).length > 0) return erroCampos(t, erros);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lojistas")
    .update({
      cep,
      logradouro: v.logradouro,
      numero: v.numero,
      complemento: v.complemento || null,
      bairro: v.bairro,
      cidade: v.cidade,
      uf: v.uf,
    })
    .eq("id", usuario.id)
    .select("id");
  if (error || !data || data.length === 0) return { status: "erro", mensagem: t("salvar") };

  revalidatePath(`/${locale}/cliente`);
  return { status: "ok" };
}

// Origem do site para o link do e-mail. Nunca vem do formulário; falha fechado (ver resolverOrigem).
async function origemDoSite(): Promise<string | null> {
  const h = await headers();
  return resolverOrigem({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    producao: process.env.NODE_ENV === "production",
    host: h.get("x-forwarded-host") ?? h.get("host"),
    proto: h.get("x-forwarded-proto"),
  });
}

export async function alterarEmail(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const locale = localeValido(form.get("locale"));
  const t = await tradutor(locale);
  const usuario = await lojistaAtual();
  if (!usuario) return { status: "erro", mensagem: t("sessao") };

  const { valores: v, problemas } = lerCampos(form, { email: 254 });
  if (problemas.email) return erroCampos(t, { email: t("email") });
  const novo = normalizarEmail(v.email);
  if (!novo) return erroCampos(t, { email: t("email") });
  if (novo === usuario.email.toLowerCase()) return erroCampos(t, { email: t("emailIgual") });

  const origem = await origemDoSite();
  if (!origem) {
    console.error("alterarEmail: origem do site indisponivel; defina NEXT_PUBLIC_SITE_URL.");
    return { status: "erro", mensagem: t("salvar") };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: novo },
    { emailRedirectTo: `${origem}/${locale}/auth/confirm` },
  );
  if (error) {
    if (error.code === "email_exists") return erroCampos(t, { email: t("emailEmUso") });
    if (error.code === "over_email_send_rate_limit") return { status: "erro", mensagem: t("limite") };
    return { status: "erro", mensagem: t("salvar") };
  }

  revalidatePath(`/${locale}/cliente`);
  return { status: "ok" };
}

export async function alterarSenha(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const locale = localeValido(form.get("locale"));
  const t = await tradutor(locale);
  if (!flags.trocaSenha) return { status: "erro", mensagem: t("indisponivel") };
  const usuario = await lojistaAtual();
  if (!usuario) return { status: "erro", mensagem: t("sessao") };

  // Senha não leva trim: espaços fazem parte dela.
  const nova = form.get("nova");
  const confirmar = form.get("confirmar");
  if (typeof nova !== "string" || typeof confirmar !== "string") {
    return { status: "erro", mensagem: t("invalido") };
  }
  const erros: Record<string, string> = {};
  if (nova.length < 8) erros.nova = t("senhaCurta");
  else if (nova.length > 72) erros.nova = t("longo");
  if (!erros.nova && nova !== confirmar) erros.confirmar = t("senhaDiferente");
  if (Object.keys(erros).length > 0) return erroCampos(t, erros);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    if (error.code === "same_password") return erroCampos(t, { nova: t("senhaIgual") });
    if (error.code === "weak_password") return erroCampos(t, { nova: t("senhaFraca") });
    return { status: "erro", mensagem: t("salvar") };
  }
  return { status: "ok" };
}
