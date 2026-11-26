// Leitura da planilha de produtos (.xlsx). Código de servidor: nunca importar em componente cliente.
import ExcelJS from "exceljs";
import {
  MSG_ESPECIFICACAO,
  MSG_IMAGEM_HTTPS,
  MSG_MANUAL_HTTPS,
  validarCampos,
  type ItemProduto,
} from "@/lib/admin/produto";

// Flags "manter" (só a planilha usa; o RPC as honra em produto existente):
// - manter_especificacoes: planilha sem a aba Especificacoes;
// - manter_imagens: sem a aba Imagens, ou o código só tem arquivos pendentes (nenhum link https);
// - manter_manual: célula do manual vazia ou com arquivo pendente.
export type ProdutoImportado = Omit<ItemProduto, "slug"> & {
  manter_especificacoes: boolean;
  manter_imagens: boolean;
  manter_manual: boolean;
};
export type ErroPlanilha = { aba: string; linha: number; mensagem: string };
export type PendenciaArquivo = { codigo: string; arquivo: string; tipo: "imagem" | "manual" };
export type ResultadoLeitura = {
  produtos: ProdutoImportado[];
  erros: ErroPlanilha[];
  pendencias: PendenciaArquivo[];
};

const ABA_PRODUTOS = "Produtos";
const ABA_ESPECIFICACOES = "Especificacoes";
const ABA_IMAGENS = "Imagens";

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// "preco (R$)" -> "preco"; "codigo do produto *" -> "codigo"; "texto alternativo" -> "alt".
function chaveCabecalho(bruto: string): string {
  const k = semAcento(bruto)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (k === "codigo do produto") return "codigo";
  if (k === "texto alternativo") return "alt";
  return k;
}

function numeroParaTexto(n: number): string {
  if (Number.isInteger(n) && Number.isSafeInteger(n)) return BigInt(n).toString();
  const s = String(n);
  return /e/i.test(s) ? n.toFixed(12).replace(/0+$/, "").replace(/\.$/, "") : s;
}

// Normaliza qualquer valor de célula do Excel para texto. `link` prefere o endereço do hiperlink.
function celulaTexto(v: ExcelJS.CellValue | undefined, link = false): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return numeroParaTexto(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("").trim();
    }
    if (typeof o.hyperlink === "string") {
      if (link) return o.hyperlink.trim();
      return celulaTexto(o.text as ExcelJS.CellValue) || o.hyperlink.trim();
    }
    if ("result" in o) return celulaTexto(o.result as ExcelJS.CellValue, link);
    if ("error" in o) return "";
    if (typeof o.text === "string") return o.text.trim();
  }
  return "";
}

type Aba = { sheet: ExcelJS.Worksheet; colunas: Map<string, number> };

function achaAba(wb: ExcelJS.Workbook, nome: string): ExcelJS.Worksheet | undefined {
  const alvo = semAcento(nome).toLowerCase();
  return wb.worksheets.find((w) => semAcento(w.name).trim().toLowerCase() === alvo);
}

function abrirAba(
  wb: ExcelJS.Workbook,
  nome: string,
  obrigatorias: string[],
  erros: ErroPlanilha[],
  existeObrigatoria: boolean,
): Aba | null {
  const sheet = achaAba(wb, nome);
  if (!sheet) {
    if (existeObrigatoria) erros.push({ aba: nome, linha: 1, mensagem: `Aba "${nome}" não encontrada na planilha.` });
    return null;
  }
  const colunas = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const k = chaveCabecalho(celulaTexto(cell.value));
    if (k && !colunas.has(k)) colunas.set(k, col);
  });
  const faltam = obrigatorias.filter((c) => !colunas.has(c));
  if (faltam.length > 0) {
    erros.push({
      aba: nome,
      linha: 1,
      mensagem: `Coluna obrigatória ausente: ${faltam.join(", ")}.`,
    });
    return null;
  }
  return { sheet, colunas };
}

// Percorre as linhas de dados (linha 2 em diante), ignorando as totalmente vazias.
function* linhas(aba: Aba): Generator<{ linha: number; ler: (c: string, link?: boolean) => string }> {
  for (let r = 2; r <= aba.sheet.rowCount; r++) {
    const row = aba.sheet.getRow(r);
    let vazia = true;
    for (const col of aba.colunas.values()) {
      if (celulaTexto(row.getCell(col).value) !== "") {
        vazia = false;
        break;
      }
    }
    if (vazia) continue;
    yield {
      linha: r,
      ler: (c, link = false) => {
        const col = aba.colunas.get(c);
        return col ? celulaTexto(row.getCell(col).value, link) : "";
      },
    };
  }
}

const apenasDigitos = (v: string) => v.replace(/[.\-/\s]/g, "");

function lerAtivo(v: string): boolean | null {
  const k = semAcento(v).toLowerCase().trim();
  if (k === "") return true;
  if (["sim", "s", "true", "1", "verdadeiro"].includes(k)) return true;
  if (["nao", "n", "false", "0", "falso"].includes(k)) return false;
  return null;
}

function limparPreco(v: string): string {
  return v.replace(/R\$/gi, "").replace(/[\s ]/g, "");
}

const temEsquemaHttp = (v: string) => /^https?:\/\//i.test(v);
const ehHttps = (v: string) => /^https:\/\//i.test(v);

export async function lerPlanilha(buffer: ArrayBuffer): Promise<ResultadoLeitura> {
  const resultado: ResultadoLeitura = { produtos: [], erros: [], pendencias: [] };
  const { erros, pendencias } = resultado;

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    erros.push({ aba: "Arquivo", linha: 0, mensagem: "Não foi possível ler o arquivo. Envie uma planilha .xlsx válida." });
    return resultado;
  }

  const abaProdutos = abrirAba(wb, ABA_PRODUTOS, ["codigo", "nome"], erros, true);
  if (!abaProdutos) return resultado;

  const porCodigo = new Map<string, ProdutoImportado | null>(); // null: linha com erro
  const linhaDoCodigo = new Map<string, number>();

  for (const { linha, ler } of linhas(abaProdutos)) {
    const codigo = ler("codigo");
    if (codigo && porCodigo.has(codigo)) {
      erros.push({
        aba: ABA_PRODUTOS,
        linha,
        mensagem: `Código repetido na planilha (já usado na linha ${linhaDoCodigo.get(codigo)}).`,
      });
      continue;
    }
    if (codigo) linhaDoCodigo.set(codigo, linha);

    const ativo = lerAtivo(ler("ativo"));
    const manual = ler("manual", true);

    const v = validarCampos({
      codigo,
      nome: ler("nome"),
      slug: "",
      ncm: ((n) => (/^\d{7}$/.test(n) ? `0${n}` : n))(apenasDigitos(ler("ncm"))),
      cest: apenasDigitos(ler("cest")),
      ean: apenasDigitos(ler("ean")),
      origem: ler("origem") || "0",
      preco: limparPreco(ler("preco")),
      peso_kg: ler("peso_kg"),
      altura_cm: ler("altura_cm"),
      largura_cm: ler("largura_cm"),
      comprimento_cm: ler("comprimento_cm"),
      manual_url: ehHttps(manual) ? manual : "",
    });
    let mensagem: string | null = v.ok ? null : v.erro;
    if (!mensagem && ativo === null) mensagem = "Ativo inválido: use SIM ou NÃO.";
    if (!mensagem && manual && temEsquemaHttp(manual) && !ehHttps(manual)) mensagem = MSG_MANUAL_HTTPS;
    if (mensagem || !v.ok || ativo === null) {
      erros.push({ aba: ABA_PRODUTOS, linha, mensagem: mensagem ?? "Linha inválida." });
      if (codigo) porCodigo.set(codigo, null);
      continue;
    }

    const { slug: _slug, ...campos } = v.campos;
    void _slug;
    if (manual && !temEsquemaHttp(manual)) {
      pendencias.push({ codigo: campos.codigo, arquivo: manual, tipo: "manual" });
    }
    porCodigo.set(campos.codigo, {
      ...campos,
      ativo,
      destaque: ler("destaque") || null,
      compatibilidade: ler("compatibilidade") || null,
      descricao: ler("descricao") || null,
      aplicacoes: ler("aplicacoes") || null,
      unidade: ler("unidade") || "UN",
      especificacoes: [],
      imagens: [],
      manter_especificacoes: !achaAba(wb, ABA_ESPECIFICACOES),
      manter_imagens: !achaAba(wb, ABA_IMAGENS),
      manter_manual: !ehHttps(manual),
    });
  }

  const abaEsp = abrirAba(wb, ABA_ESPECIFICACOES, ["codigo", "nome", "valor"], erros, false);
  if (abaEsp) {
    for (const { linha, ler } of linhas(abaEsp)) {
      const codigo = ler("codigo");
      if (!porCodigo.has(codigo)) {
        erros.push({ aba: ABA_ESPECIFICACOES, linha, mensagem: "Código não encontrado na aba Produtos." });
        continue;
      }
      const nome = ler("nome");
      const valor = ler("valor");
      if (!nome || !valor) {
        erros.push({ aba: ABA_ESPECIFICACOES, linha, mensagem: MSG_ESPECIFICACAO });
        continue;
      }
      porCodigo.get(codigo)?.especificacoes.push({ nome, valor });
    }
  }

  const abaImg = abrirAba(wb, ABA_IMAGENS, ["codigo", "imagem"], erros, false);
  if (abaImg) {
    const comPendencia = new Set<string>();
    for (const { linha, ler } of linhas(abaImg)) {
      const codigo = ler("codigo");
      if (!porCodigo.has(codigo)) {
        erros.push({ aba: ABA_IMAGENS, linha, mensagem: "Código não encontrado na aba Produtos." });
        continue;
      }
      const imagem = ler("imagem", true);
      if (!imagem) {
        erros.push({ aba: ABA_IMAGENS, linha, mensagem: "Informe o link ou o nome do arquivo da imagem." });
        continue;
      }
      if (ehHttps(imagem)) {
        porCodigo.get(codigo)?.imagens.push({ url: imagem, alt: ler("alt") });
      } else if (temEsquemaHttp(imagem)) {
        erros.push({ aba: ABA_IMAGENS, linha, mensagem: MSG_IMAGEM_HTTPS });
      } else {
        pendencias.push({ codigo, arquivo: imagem, tipo: "imagem" });
        comPendencia.add(codigo);
      }
    }
    // Só arquivos pendentes para o código: não apaga as imagens que o produto já tem.
    for (const [codigo, p] of porCodigo) {
      if (p) p.manter_imagens = p.imagens.length === 0 && comPendencia.has(codigo);
    }
  }

  for (const p of porCodigo.values()) if (p) resultado.produtos.push(p);
  return resultado;
}

/** Códigos que já têm preço no banco e chegam sem preço: a importação vai remover o preço atual. */
export function codigosComPrecoRemovido(
  produtos: Pick<ProdutoImportado, "codigo" | "preco">[],
  comPrecoAtual: Set<string>,
): string[] {
  return produtos.filter((p) => p.preco === null && comPrecoAtual.has(p.codigo)).map((p) => p.codigo);
}
