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
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) norm = v.replace(/\./g, "").replace(",", ".");
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

export function validarProduto(form: FormData): ResultadoValidacao {
  const erro = (e: string): ResultadoValidacao => ({ ok: false, erro: e });

  const codigo = texto(form, "codigo");
  if (!codigo) return erro("Informe o código do produto.");
  const nome = texto(form, "nome");
  if (!nome) return erro("Informe o nome do produto.");

  const slug = opcional(form, "slug");
  if (slug && !SLUG.test(slug)) {
    return erro("Slug inválido: use letras minúsculas, números e hífens (ex.: placa-rele-24v).");
  }

  const ncm = opcional(form, "ncm");
  if (ncm && !/^\d{8}$/.test(ncm)) return erro("NCM inválido: informe 8 dígitos.");
  const cest = opcional(form, "cest");
  if (cest && !/^\d{7}$/.test(cest)) return erro("CEST inválido: informe 7 dígitos.");
  const ean = opcional(form, "ean");
  if (ean && !/^(\d{8}|\d{12,14})$/.test(ean)) {
    return erro("EAN inválido: informe 8, 12, 13 ou 14 dígitos.");
  }

  const origemTxt = opcional(form, "origem");
  let origem: number | null = null;
  if (origemTxt !== null) {
    if (!/^[0-8]$/.test(origemTxt)) return erro("Origem inválida: informe um número de 0 a 8.");
    origem = Number(origemTxt);
  }

  const preco = parseDecimal(texto(form, "preco"));
  if (Number.isNaN(preco)) return erro("Preço inválido: informe um valor maior ou igual a 0.");

  const medidas: Record<string, number | null> = {};
  for (const [campo, rotulo] of [
    ["peso_kg", "Peso"],
    ["altura_cm", "Altura"],
    ["largura_cm", "Largura"],
    ["comprimento_cm", "Comprimento"],
  ] as const) {
    const n = parseDecimal(texto(form, campo));
    if (Number.isNaN(n)) return erro(`${rotulo} inválido: informe um número maior ou igual a 0.`);
    medidas[campo] = n;
  }

  const manual = opcional(form, "manual_url");
  if (manual && !urlHttps(manual)) return erro("O link do manual deve começar com https://.");

  const espBruto = lerLista(form, "especificacoes_json");
  if (!espBruto) return erro("Especificações inválidas.");
  const especificacoes: { nome: string; valor: string }[] = [];
  for (const e of espBruto) {
    const o = (e ?? {}) as Record<string, unknown>;
    const n = str(o.nome);
    const v = str(o.valor);
    if (!n && !v) continue; // linha em branco
    if (!n || !v) return erro("Cada especificação precisa de nome e valor.");
    especificacoes.push({ nome: n, valor: v });
  }

  const imgBruto = lerLista(form, "imagens_json");
  if (!imgBruto) return erro("Imagens inválidas.");
  const imagens: { url: string; alt: string }[] = [];
  for (const i of imgBruto) {
    const o = (i ?? {}) as Record<string, unknown>;
    const url = str(o.url);
    if (!url) continue;
    if (!urlHttps(url)) return erro("As URLs das imagens devem começar com https://.");
    imagens.push({ url, alt: str(o.alt) });
  }

  return {
    ok: true,
    item: {
      codigo,
      nome,
      slug,
      preco,
      ativo: form.get("ativo") === "on" || form.get("ativo") === "true",
      destaque: opcional(form, "destaque"),
      compatibilidade: opcional(form, "compatibilidade"),
      descricao: opcional(form, "descricao"),
      aplicacoes: opcional(form, "aplicacoes"),
      ncm,
      cest,
      ean,
      origem,
      unidade: opcional(form, "unidade") ?? "UN",
      peso_kg: medidas.peso_kg,
      altura_cm: medidas.altura_cm,
      largura_cm: medidas.largura_cm,
      comprimento_cm: medidas.comprimento_cm,
      manual_url: manual,
      especificacoes,
      imagens,
    },
  };
}
