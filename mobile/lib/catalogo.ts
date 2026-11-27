import { supabase } from "./supabase";

// Mesma consulta pública do site (web/services/catalogo.ts): produtos ativos, sem preço.
// Preço só existe para lojista logado (precos_cliente, em lib/precos).

export type ImagemProduto = { url: string; alt: string | null };
export type Especificacao = { nome: string; valor: string };

export type ProdutoPublico = {
  id: string;
  slug: string;
  codigo: string;
  nome: string;
  destaque: string | null;
  compatibilidade: string | null;
  descricao: string | null;
  aplicacoes: string | null;
  manual_url: string | null;
  imagens: ImagemProduto[];
  especificacoes: Especificacao[];
};

const COLUNAS =
  "id, slug, codigo, nome, destaque, compatibilidade, descricao, aplicacoes, manual_url, " +
  "produto_imagens(url, alt, ordem), produto_especificacoes(nome, valor, ordem)";

export type LinhaProduto = Omit<ProdutoPublico, "imagens" | "especificacoes"> & {
  produto_imagens: { url: string; alt: string | null; ordem: number }[] | null;
  produto_especificacoes: { nome: string; valor: string; ordem: number }[] | null;
};

function porOrdem<T extends { ordem: number }>(a: T, b: T) {
  return a.ordem - b.ordem;
}

export function paraProduto(l: LinhaProduto): ProdutoPublico {
  const { produto_imagens, produto_especificacoes, ...resto } = l;
  return {
    ...resto,
    imagens: [...(produto_imagens ?? [])]
      .sort(porOrdem)
      .filter((i) => typeof i.url === "string" && i.url.trim() !== "")
      .map(({ url, alt }) => ({ url, alt })),
    especificacoes: [...(produto_especificacoes ?? [])]
      .sort(porOrdem)
      .map(({ nome, valor }) => ({ nome, valor })),
  };
}

export async function listarProdutos(): Promise<ProdutoPublico[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select(COLUNAS)
    .eq("ativo", true)
    .order("codigo");
  if (error) throw new Error(`Falha ao listar produtos: ${error.message}`);
  return ((data ?? []) as unknown as LinhaProduto[]).map(paraProduto);
}

export async function obterProdutoPorSlug(slug: string): Promise<ProdutoPublico | null> {
  const { data, error } = await supabase
    .from("produtos")
    .select(COLUNAS)
    .eq("ativo", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Falha ao obter produto: ${error.message}`);
  return data ? paraProduto(data as unknown as LinhaProduto) : null;
}

/** Minúsculas e sem acentos, para a busca ignorar "ç", "ã" etc. */
export function normalizarBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Busca por código, nome ou compatibilidade (como o site, mais a compatibilidade). */
export function filtrarProdutos(produtos: readonly ProdutoPublico[], busca: string): ProdutoPublico[] {
  const termo = normalizarBusca(busca.trim());
  if (!termo) return [...produtos];
  return produtos.filter((p) =>
    normalizarBusca(`${p.codigo} ${p.nome} ${p.compatibilidade ?? ""}`).includes(termo),
  );
}

export type BlocoTexto = { tipo: "paragrafo"; texto: string } | { tipo: "lista"; itens: string[] };

/**
 * Mesmo formato do site (TextoProduto): parágrafos separados por linha em branco;
 * blocos cujas linhas começam com "- " viram lista. Nunca interpreta HTML.
 */
export function blocosDeTexto(texto: string | null | undefined): BlocoTexto[] {
  if (!texto) return [];
  return texto
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((bloco): BlocoTexto => {
      const linhas = bloco.split("\n").map((l) => l.trim());
      if (linhas.every((l) => l.startsWith("- "))) {
        return { tipo: "lista", itens: linhas.map((l) => l.slice(2).trim()) };
      }
      return { tipo: "paragrafo", texto: bloco };
    });
}
