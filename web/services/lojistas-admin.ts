"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { validarDocumento, type TipoDocumento } from "@/lib/validacao/documento";
import { normalizarCep } from "@/lib/validacao/cep";
import { validarTelefone } from "@/lib/validacao/telefone";
import {
  UUID,
  digitosBusca,
  normalizarEmail,
  opcional,
  parseDesconto,
  sanitizarBusca,
  texto,
} from "@/lib/admin/formulario";

export type ResultadoAdmin<T = void> = { ok: true; dados: T } | { ok: false; erro: string };

export type LojistaResumo = {
  id: string;
  nome: string;
  documento: string | null;
  email: string;
  ativo: boolean;
  anonimizado: boolean;
};

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

const MSG_DOC_DUPLICADO = "Já existe um cliente com este CPF/CNPJ.";
const MSG_EMAIL_DUPLICADO = "Já existe um usuário com este e-mail.";
const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";
const INDICADORES = ["contribuinte", "isento", "nao_contribuinte"] as const;

function emailJaExiste(e: { code?: string; message: string }) {
  return e.code === "email_exists" || /already (been )?registered|already exists/i.test(e.message);
}

function mensagemDocumento(tipo: TipoDocumento, motivo: "formato" | "digito") {
  const rotulo = tipo === "PF" ? "CPF" : "CNPJ";
  return motivo === "formato"
    ? `${rotulo} inválido: informe ${tipo === "PF" ? 11 : 14} dígitos.`
    : `${rotulo} inválido: dígito verificador incorreto.`;
}

function revalidar() {
  revalidatePath("/[locale]/admin", "layout");
}

export async function listarLojistas(busca?: string): Promise<LojistaResumo[]> {
  await exigirAdmin();
  const db = createAdminClient();
  let consulta = db
    .from("lojistas")
    .select("id, nome, documento, email, ativo, anonimizado_em")
    .order("nome", { ascending: true })
    .limit(200);

  const termo = sanitizarBusca(busca ?? "");
  if (termo) {
    const filtros = [`nome.ilike.%${termo}%`, `nome_fantasia.ilike.%${termo}%`];
    const digitos = digitosBusca(termo);
    if (digitos) filtros.push(`documento.ilike.%${digitos}%`);
    consulta = consulta.or(filtros.join(","));
  }

  const { data, error } = await consulta;
  if (error) throw new Error("Falha ao listar clientes.");
  return data.map((l) => ({
    id: l.id,
    nome: l.nome,
    documento: l.documento,
    email: l.email,
    ativo: l.ativo,
    anonimizado: l.anonimizado_em !== null,
  }));
}

export async function criarLojista(
  form: FormData,
): Promise<ResultadoAdmin<{ id: string; senha: string }>> {
  await exigirAdmin();

  // 1. Validar
  const tipo = texto(form, "tipo_pessoa");
  if (tipo !== "PF" && tipo !== "PJ") return erro("Tipo de pessoa inválido.");
  const doc = validarDocumento(tipo, texto(form, "documento"));
  if (!doc.ok) return erro(mensagemDocumento(tipo, doc.erro));
  const nome = texto(form, "nome");
  if (!nome) return erro("Informe o nome ou a razão social.");
  const email = normalizarEmail(texto(form, "email"));
  if (!email) return erro("Informe um e-mail válido.");
  const desconto = parseDesconto(texto(form, "desconto_percentual"));
  if (desconto === null) return erro("Desconto deve ser um número entre 0 e 100.");

  const db = createAdminClient();

  // 2. Documento duplicado
  const { data: existente, error: eBusca } = await db
    .from("lojistas")
    .select("id")
    .eq("documento", doc.documento)
    .maybeSingle();
  if (eBusca) return erro(MSG_GENERICA);
  if (existente) return erro(MSG_DOC_DUPLICADO);

  // 3. Usuário no Auth
  const senha = gerarSenhaProvisoria();
  const { data: criado, error: eAuth } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { nome, papel: "lojista" },
  });
  if (eAuth || !criado.user) {
    return erro(eAuth && emailJaExiste(eAuth) ? MSG_EMAIL_DUPLICADO : MSG_GENERICA);
  }
  const id = criado.user.id;

  // 4. Linha em lojistas; 5. sem órfãos se falhar
  const { error: eInsert } = await db.from("lojistas").insert({
    id,
    tipo_pessoa: tipo,
    documento: doc.documento,
    nome,
    email,
    desconto_percentual: desconto,
  });
  if (eInsert) {
    await db.auth.admin.deleteUser(id);
    return erro(eInsert.code === "23505" ? MSG_DOC_DUPLICADO : MSG_GENERICA);
  }

  revalidar();
  return ok({ id, senha });
}

export async function atualizarLojista(id: string, form: FormData): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(id)) return erro("Cliente não encontrado.");

  const nome = texto(form, "nome");
  if (!nome) return erro("Informe o nome ou a razão social.");
  const email = normalizarEmail(texto(form, "email"));
  if (!email) return erro("Informe um e-mail válido.");
  const desconto = parseDesconto(texto(form, "desconto_percentual"));
  if (desconto === null) return erro("Desconto deve ser um número entre 0 e 100.");

  const indicador = texto(form, "indicador_ie");
  if (!INDICADORES.some((i) => i === indicador)) return erro("Indicador de IE inválido.");

  const telefoneBruto = texto(form, "telefone");
  const telefone = telefoneBruto ? validarTelefone(telefoneBruto) : null;
  if (telefoneBruto && !telefone) return erro("Telefone inválido.");
  const whatsappBruto = texto(form, "whatsapp");
  const whatsapp = whatsappBruto ? validarTelefone(whatsappBruto) : null;
  if (whatsappBruto && !whatsapp) return erro("WhatsApp inválido.");

  const cepBruto = texto(form, "cep");
  const cep = cepBruto ? normalizarCep(cepBruto) : null;
  if (cepBruto && !cep) return erro("CEP inválido.");

  const uf = opcional(form, "uf")?.toUpperCase() ?? null;
  if (uf && !/^[A-Z]{2}$/.test(uf)) return erro("UF inválida.");

  const db = createAdminClient();
  const { data: atual, error: eLer } = await db
    .from("lojistas")
    .select("nome, email, anonimizado_em")
    .eq("id", id)
    .maybeSingle();
  if (eLer) return erro(MSG_GENERICA);
  if (!atual) return erro("Cliente não encontrado.");
  if (atual.anonimizado_em) return erro("Cliente anonimizado não pode ser editado.");

  if (nome !== atual.nome || email !== atual.email) {
    const { error: eAuth } = await db.auth.admin.updateUserById(id, {
      ...(email !== atual.email ? { email, email_confirm: true } : {}),
      ...(nome !== atual.nome ? { app_metadata: { nome, papel: "lojista" } } : {}),
    });
    if (eAuth) return erro(emailJaExiste(eAuth) ? MSG_EMAIL_DUPLICADO : MSG_GENERICA);
  }

  // O e-mail em lojistas é espelhado do Auth por trigger.
  const { data: atualizados, error: eUpdate } = await db
    .from("lojistas")
    .update({
      nome,
      nome_fantasia: opcional(form, "nome_fantasia"),
      inscricao_estadual: opcional(form, "inscricao_estadual"),
      indicador_ie: indicador as (typeof INDICADORES)[number],
      responsavel_nome: opcional(form, "responsavel_nome"),
      telefone,
      whatsapp,
      cep,
      logradouro: opcional(form, "logradouro"),
      numero: opcional(form, "numero"),
      complemento: opcional(form, "complemento"),
      bairro: opcional(form, "bairro"),
      cidade: opcional(form, "cidade"),
      uf,
      desconto_percentual: desconto,
    })
    .eq("id", id)
    // anonimizado entre a leitura e o update: não regrava dados pessoais
    .is("anonimizado_em", null)
    .select("id");
  if (eUpdate) return erro(MSG_GENERICA);
  if (atualizados.length === 0) return erro("Cliente não encontrado ou já anonimizado.");

  revalidar();
  return ok(undefined);
}

export async function definirAtivo(id: string, ativo: boolean): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(id)) return erro("Cliente não encontrado.");
  const { data, error } = await createAdminClient()
    .from("lojistas")
    .update({ ativo })
    .eq("id", id)
    .is("anonimizado_em", null)
    .select("id");
  if (error) return erro(MSG_GENERICA);
  if (data.length === 0) return erro("Cliente não encontrado ou já anonimizado.");
  revalidar();
  return ok(undefined);
}

export async function gerarNovaSenha(id: string): Promise<ResultadoAdmin<{ senha: string }>> {
  await exigirAdmin();
  if (!UUID.test(id)) return erro("Cliente não encontrado.");
  const db = createAdminClient();
  const { data: l, error: eLer } = await db
    .from("lojistas")
    .select("anonimizado_em")
    .eq("id", id)
    .maybeSingle();
  if (eLer) return erro(MSG_GENERICA);
  if (!l) return erro("Cliente não encontrado.");
  if (l.anonimizado_em) return erro("Cliente anonimizado não pode receber nova senha.");

  const senha = gerarSenhaProvisoria();
  const { error } = await db.auth.admin.updateUserById(id, { password: senha });
  if (error) return erro(MSG_GENERICA);
  return ok({ senha });
}

export async function anonimizarLojista(id: string): Promise<ResultadoAdmin> {
  await exigirAdmin();
  if (!UUID.test(id)) return erro("Cliente não encontrado.");
  const db = createAdminClient();
  const { data: l, error: eLer } = await db
    .from("lojistas")
    .select("anonimizado_em")
    .eq("id", id)
    .maybeSingle();
  if (eLer) return erro(MSG_GENERICA);
  if (!l) return erro("Cliente não encontrado.");
  if (l.anonimizado_em) return erro("Cliente já anonimizado.");

  const emailAnonimo = `anonimizado-${id}@invalid`;
  const { error: eAuth } = await db.auth.admin.updateUserById(id, {
    email: emailAnonimo,
    ban_duration: "876000h",
    app_metadata: { nome: "Cliente anonimizado", papel: "lojista" },
  });
  if (eAuth) return erro(MSG_GENERICA);

  // Limpa o resto da PII no schema auth (metadados, identities, tokens) e
  // revoga as sessões: o ban acima só vale na emissão de novos tokens.
  // Idempotente: repetir a anonimização refaz este passo sem efeito colateral.
  const { error: eAuthPii } = await db.rpc("anonimizar_auth", {
    uid: id,
    email_anonimo: emailAnonimo,
  });
  if (eAuthPii) return erro("Acesso bloqueado, mas os dados não foram apagados. Tente novamente.");

  const { error: eUpdate } = await db
    .from("lojistas")
    .update({
      documento: null,
      nome: "Cliente anonimizado",
      nome_fantasia: null,
      email: emailAnonimo,
      inscricao_estadual: null,
      responsavel_nome: null,
      telefone: null,
      whatsapp: null,
      cep: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
      ativo: false,
      anonimizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (eUpdate) return erro("Acesso bloqueado, mas os dados não foram apagados. Tente novamente.");

  revalidar();
  return ok(undefined);
}
