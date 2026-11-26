"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { exigirAdmin } from "@/lib/auth/exigir-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assinarCloudinary } from "@/lib/cloudinary/assinatura";
import { UUID, sanitizarBusca } from "@/lib/admin/formulario";
import { validarProduto } from "@/lib/admin/produto";

import type { ResultadoAdmin } from "@/lib/admin/resultado";


export type ProdutoAdmin = {
  id: string;
  codigo: string;
  nome: string;
  slug: string;
  ativo: boolean;
  preco: number | null;
  destaque: string | null;
  compatibilidade: string | null;
  descricao: string | null;
  aplicacoes: string | null;
  ncm: string | null;
  cest: string | null;
  ean: string | null;
  origem: number | null;
  unidade: string;
  peso_kg: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  manual_url: string | null;
  imagens: { url: string; alt: string }[];
  especificacoes: { nome: string; valor: string }[];
};

export type ProdutoResumo = Pick<ProdutoAdmin, "id" | "codigo" | "nome" | "ativo" | "preco"> & {
  /** URL da primeira imagem (miniatura na lista), se houver. */
  imagem: string | null;
};

const erro = (mensagem: string) => ({ ok: false as const, erro: mensagem });
const ok = <T>(dados: T) => ({ ok: true as const, dados });

const MSG_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

const LIMITES = {
  image: { folder: "nex/produtos", maxBytes: 5 * 1024 * 1024 },
  raw: { folder: "nex/manuais", maxBytes: 20 * 1024 * 1024 },
} as const;

type ErroBanco = { code?: string; message?: string };

function mensagemBanco(e: ErroBanco): string {
  const m = e.message ?? "";
  if (e.code === "23505") {
    if (m.includes("slug")) return "Já existe um produto com este slug.";
    if (m.includes("codigo")) return "Já existe um produto com este código.";
    return "Já existe um produto com estes dados.";
  }
  if (e.code === "23514") {
    if (m.includes("ncm")) return "NCM inválido: informe 8 dígitos.";
    if (m.includes("cest")) return "CEST inválido: informe 7 dígitos.";
    if (m.includes("ean")) return "EAN inválido: informe 8, 12, 13 ou 14 dígitos.";
    if (m.includes("slug")) return "Slug inválido: use letras minúsculas, números e hífens.";
    return "Algum campo está com valor inválido.";
  }
  if (m.includes("produto_nao_encontrado")) return "Produto não encontrado.";
  if (m.includes("nao_autorizado")) return "Acesso negado.";
  return MSG_GENERICA;
}

export async function assinarUpload(tipo: "image" | "raw"): Promise<
  ResultadoAdmin<{
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
    resourceType: "image" | "raw";
    maxBytes: number;
  }>
> {
  await exigirAdmin();
  if (tipo !== "image" && tipo !== "raw") return erro("Tipo de arquivo inválido.");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const segredo = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !segredo) {
    return erro("Upload indisponível: Cloudinary não configurado. Cole a URL do arquivo.");
  }
  const { folder, maxBytes } = LIMITES[tipo];
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = assinarCloudinary({ folder, timestamp }, segredo);
  return ok({ cloudName, apiKey, timestamp, folder, signature, resourceType: tipo, maxBytes });
}

type LinhaProduto = Omit<ProdutoAdmin, "preco" | "imagens" | "especificacoes" | "peso_kg" | "altura_cm" | "largura_cm" | "comprimento_cm"> & {
  peso_kg: number | string | null;
  altura_cm: number | string | null;
  largura_cm: number | string | null;
  comprimento_cm: number | string | null;
  produto_precos: { preco: number | string } | { preco: number | string }[] | null;
  produto_imagens: { url: string; alt: string | null; ordem: number }[];
  produto_especificacoes: { nome: string; valor: string; ordem: number }[];
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

function precoDe(p: LinhaProduto["produto_precos"]): number | null {
  const linha = Array.isArray(p) ? p[0] : p;
  return linha ? Number(linha.preco) : null;
}

export async function listarProdutosAdmin(busca?: string): Promise<ProdutoResumo[]> {
  await exigirAdmin();
  let consulta = createAdminClient()
    .from("produtos")
    .select("id, codigo, nome, ativo, produto_precos(preco), produto_imagens(url, ordem)")
    .order("codigo", { ascending: true })
    .limit(300);
  const termo = sanitizarBusca(busca ?? "");
  if (termo) consulta = consulta.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`);
  const { data, error } = await consulta;
  if (error) throw new Error("Falha ao listar produtos.");
  type Linha = Pick<LinhaProduto, "id" | "codigo" | "nome" | "ativo" | "produto_precos"> & {
    produto_imagens: { url: string; ordem: number }[];
  };
  return (data as unknown as Linha[]).map((l) => ({
    id: l.id,
    codigo: l.codigo,
    nome: l.nome,
    ativo: l.ativo,
    preco: precoDe(l.produto_precos),
    imagem: [...l.produto_imagens].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? null,
  }));
}

export async function obterProdutoAdmin(id: string): Promise<ProdutoAdmin | null> {
  await exigirAdmin();
  if (!UUID.test(id)) return null;
  const { data, error } = await createAdminClient()
    .from("produtos")
    .select("*, produto_precos(preco), produto_imagens(url, alt, ordem), produto_especificacoes(nome, valor, ordem)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Falha ao obter produto.");
  if (!data) return null;
  const l = data as unknown as LinhaProduto;
  return {
    id: l.id,
    codigo: l.codigo,
    nome: l.nome,
    slug: l.slug,
    ativo: l.ativo,
    preco: precoDe(l.produto_precos),
    destaque: l.destaque,
    compatibilidade: l.compatibilidade,
    descricao: l.descricao,
    aplicacoes: l.aplicacoes,
    ncm: l.ncm,
    cest: l.cest,
    ean: l.ean,
    origem: l.origem,
    unidade: l.unidade,
    peso_kg: num(l.peso_kg),
    altura_cm: num(l.altura_cm),
    largura_cm: num(l.largura_cm),
    comprimento_cm: num(l.comprimento_cm),
    manual_url: l.manual_url,
    imagens: [...l.produto_imagens].sort((a, b) => a.ordem - b.ordem).map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    especificacoes: [...l.produto_especificacoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((e) => ({ nome: e.nome, valor: e.valor })),
  };
}

// useActionState: (estado anterior, form). `id` vazio cria; preenchido atualiza.
// O item é sempre completo: a RPC substitui tudo (campos ausentes viram null).
export async function salvarProduto(
  _anterior: ResultadoAdmin<{ id: string }> | null,
  form: FormData,
): Promise<ResultadoAdmin<{ id: string }>> {
  await exigirAdmin();

  const idBruto = form.get("id");
  const id = typeof idBruto === "string" ? idBruto.trim() : "";
  if (id && !UUID.test(id)) return erro("Produto não encontrado.");

  const v = validarProduto(form);
  if (!v.ok) return erro(v.erro);

  // Cadastro novo não pode sobrescrever, por upsert, um produto que já tem esse código.
  if (!id) {
    const { data: existente, error: eDup } = await createAdminClient()
      .from("produtos")
      .select("id")
      .eq("codigo", v.item.codigo)
      .maybeSingle();
    if (eDup) return erro(MSG_GENERICA);
    if (existente) return erro("Já existe um produto com este código.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_importar_produtos", {
    p: [id ? { id, ...v.item } : v.item],
  });
  if (error) return erro(mensagemBanco(error));

  let salvoId = id;
  if (!salvoId) {
    const { data, error: eBusca } = await createAdminClient()
      .from("produtos")
      .select("id")
      .eq("codigo", v.item.codigo)
      .maybeSingle();
    if (eBusca || !data) return erro(MSG_GENERICA);
    salvoId = data.id;
  }

  revalidateTag("catalogo");
  revalidatePath("/[locale]/admin", "layout");
  return ok({ id: salvoId });
}
