// Validação pura do formulário de produto do painel admin (sem I/O).
import { opcional, texto } from "@/lib/admin/formulario";

export type ItemProduto = {
  codigo: string;
  nome: string;
  slug: string | null;
  preco: number | null;
  ativo: boolean;
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
  especificacoes: { nome: string; valor: string }[];
  imagens: { url: string; alt: string }[];
};

export type ResultadoValidacao = { ok: true; item: ItemProduto } | { ok: false; erro: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LISTA = 100;

// Aceita "189,90", "189.90" e "1.234,56". Vazio vale null; negativo ou lixo vale NaN.
export function parseDecimal(valor: string): number | null {
  const v = valor.trim();
  if (v === "") return null;
  let norm = v;
  // Ponto de milhar só com vírgula decimal ("1.234,50"); "1.234" e "0.500" são decimais com ponto.
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(v)) norm = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(,\d+)?$/.test(v)) norm = v.replace(",", ".");
  else if (!/^\d+(\.\d+)?$/.test(v)) return Number.NaN;
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

function urlHttps(valor: string): boolean {
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

function lerLista(form: FormData, campo: string): unknown[] | null {
  const bruto = texto(form, campo);
  if (!bruto) return [];
  try {
    const v: unknown = JSON.parse(bruto);
    return Array.isArray(v) && v.length <= MAX_LISTA ? v : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const MSG_ESPECIFICACAO = "Cada especificação precisa de nome e valor.";
export const MSG_IMAGEM_HTTPS = "As URLs das imagens devem começar com https://.";
export const MSG_MANUAL_HTTPS = "O link do manual deve começar com https://.";

export { urlHttps };

// Campos escalares em texto bruto (formulário ou planilha).
export type CamposProduto = {
  codigo: string;
  nome: string;
  slug: string;
  ncm: string;
  cest: string;
  ean: string;
  origem: string;
  preco: string;
  peso_kg: string;
  altura_cm: string;
  largura_cm: string;
  comprimento_cm: string;
  manual_url: string;
};

export type CamposValidados = Pick<
  ItemProduto,
  | "codigo" | "nome" | "slug" | "preco" | "ncm" | "cest" | "ean" | "origem"
  | "peso_kg" | "altura_cm" | "largura_cm" | "comprimento_cm" | "manual_url"
>;

// Regras únicas dos campos escalares, compartilhadas por formulário e planilha.
export function validarCampos(c: CamposProduto): { ok: true; campos: CamposValidados } | { ok: false; erro: string } {
  const erro = (e: string) => ({ ok: false as const, erro: e });
  const vazioNull = (v: string) => v.trim() || null;

  const codigo = c.codigo.trim();
  if (!codigo) return erro("Informe o código do produto.");
  const nome = c.nome.trim();
  if (!nome) return erro("Informe o nome do produto.");

  const slug = vazioNull(c.slug);
  if (slug && !SLUG.test(slug)) {
    return erro("Slug inválido: use letras minúsculas, números e hífens (ex.: placa-rele-24v).");
  }

  const ncm = vazioNull(c.ncm);
  if (ncm && !/^\d{8}$/.test(ncm)) return erro("NCM inválido: informe 8 dígitos.");
  const cest = vazioNull(c.cest);
  if (cest && !/^\d{7}$/.test(cest)) return erro("CEST inválido: informe 7 dígitos.");
  const ean = vazioNull(c.ean);
  if (ean && !/^(\d{8}|\d{12,14})$/.test(ean)) {
    return erro("EAN inválido: informe 8, 12, 13 ou 14 dígitos.");
  }

  const origemTxt = vazioNull(c.origem);
  let origem: number | null = null;
  if (origemTxt !== null) {
    if (!/^[0-8]$/.test(origemTxt)) return erro("Origem inválida: informe um número de 0 a 8.");
    origem = Number(origemTxt);
  }

  const preco = parseDecimal(c.preco);
  if (Number.isNaN(preco)) return erro("Preço inválido: informe um valor maior ou igual a 0.");

  const medidas: Record<string, number | null> = {};
  for (const [campo, rotulo] of [
    ["peso_kg", "Peso"],
    ["altura_cm", "Altura"],
    ["largura_cm", "Largura"],
    ["comprimento_cm", "Comprimento"],
  ] as const) {
    const n = parseDecimal(c[campo]);
    if (Number.isNaN(n)) return erro(`${rotulo} inválido: informe um número maior ou igual a 0.`);
    medidas[campo] = n;
  }

  const manual = vazioNull(c.manual_url);
  if (manual && !urlHttps(manual)) return erro(MSG_MANUAL_HTTPS);

  return {
    ok: true,
    campos: {
      codigo,
      nome,
      slug,
      preco,
      ncm,
      cest,
      ean,
      origem,
      peso_kg: medidas.peso_kg,
      altura_cm: medidas.altura_cm,
      largura_cm: medidas.largura_cm,
      comprimento_cm: medidas.comprimento_cm,
      manual_url: manual,
    },
  };
}

export function validarProduto(form: FormData): ResultadoValidacao {
  const erro = (e: string): ResultadoValidacao => ({ ok: false, erro: e });

  const v = validarCampos({
    codigo: texto(form, "codigo"),
    nome: texto(form, "nome"),
    slug: texto(form, "slug"),
    ncm: texto(form, "ncm"),
    cest: texto(form, "cest"),
    ean: texto(form, "ean"),
    origem: texto(form, "origem"),
    preco: texto(form, "preco"),
    peso_kg: texto(form, "peso_kg"),
    altura_cm: texto(form, "altura_cm"),
    largura_cm: texto(form, "largura_cm"),
    comprimento_cm: texto(form, "comprimento_cm"),
    manual_url: texto(form, "manual_url"),
  });
  if (!v.ok) return v;
  const { campos } = v;

  const espBruto = lerLista(form, "especificacoes_json");
  if (!espBruto) return erro("Especificações inválidas.");
  const especificacoes: { nome: string; valor: string }[] = [];
  for (const e of espBruto) {
    const o = (e ?? {}) as Record<string, unknown>;
    const n = str(o.nome);
    const v = str(o.valor);
    if (!n && !v) continue; // linha em branco
    if (!n || !v) return erro(MSG_ESPECIFICACAO);
    especificacoes.push({ nome: n, valor: v });
  }

  const imgBruto = lerLista(form, "imagens_json");
  if (!imgBruto) return erro("Imagens inválidas.");
  const imagens: { url: string; alt: string }[] = [];
  for (const i of imgBruto) {
    const o = (i ?? {}) as Record<string, unknown>;
    const url = str(o.url);
    if (!url) continue;
    if (!urlHttps(url)) return erro(MSG_IMAGEM_HTTPS);
    imagens.push({ url, alt: str(o.alt) });
  }

  return {
    ok: true,
    item: {
      ...campos,
      ativo: form.get("ativo") === "on" || form.get("ativo") === "true",
      destaque: opcional(form, "destaque"),
      compatibilidade: opcional(form, "compatibilidade"),
      descricao: opcional(form, "descricao"),
      aplicacoes: opcional(form, "aplicacoes"),
      unidade: opcional(form, "unidade") ?? "UN",
      especificacoes,
      imagens,
    },
  };
}
