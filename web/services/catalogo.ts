import { createPublicClient } from "@/lib/supabase/publico";

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
  imagens: { url: string; alt: string | null }[];
  especificacoes: { nome: string; valor: string }[];
};

// Sem preço: preço só existe para lojista logado (ver PrecoProduto).
const COLUNAS =
  "id, slug, codigo, nome, destaque, compatibilidade, descricao, aplicacoes, manual_url, " +
  "produto_imagens(url, alt, ordem), produto_especificacoes(nome, valor, ordem)";

type Linha = Omit<ProdutoPublico, "imagens" | "especificacoes"> & {
  produto_imagens: { url: string; alt: string | null; ordem: number }[];
  produto_especificacoes: { nome: string; valor: string; ordem: number }[];
};

function porOrdem<T extends { ordem: number }>(a: T, b: T) {
  return a.ordem - b.ordem;
}

function paraProduto(l: Linha): ProdutoPublico {
  const { produto_imagens, produto_especificacoes, ...resto } = l;
  return {
    ...resto,
    imagens: [...produto_imagens].sort(porOrdem).map(({ url, alt }) => ({ url, alt })),
    especificacoes: [...produto_especificacoes]
      .sort(porOrdem)
      .map(({ nome, valor }) => ({ nome, valor })),
  };
}

export async function listarProdutosPublicos(): Promise<ProdutoPublico[]> {
  const { data, error } = await createPublicClient()
    .from("produtos")
    .select(COLUNAS)
    .eq("ativo", true)
    .order("codigo");
  if (error) throw new Error(`Falha ao listar produtos: ${error.message}`);
  return (data as unknown as Linha[]).map(paraProduto);
}

export async function obterProdutoPorSlug(slug: string): Promise<ProdutoPublico | null> {
  const { data, error } = await createPublicClient()
    .from("produtos")
    .select(COLUNAS)
    .eq("ativo", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Falha ao obter produto: ${error.message}`);
  return data ? paraProduto(data as unknown as Linha) : null;
}

export async function listarSlugsAtivos(): Promise<string[]> {
  const { data, error } = await createPublicClient().from("produtos").select("slug").eq("ativo", true);
  if (error) throw new Error(`Falha ao listar slugs: ${error.message}`);
  return data.map((p) => p.slug);
}

export type Miniatura = { slug: string; imagem: { url: string; alt: string | null } | null };

// Só apresentação (carrinho): slug e primeira imagem de cada produto ativo. Falha vira mapa vazio.
export async function miniaturasProdutos(ids: string[]): Promise<Record<string, Miniatura>> {
  if (ids.length === 0) return {};
  const { data, error } = await createPublicClient()
    .from("produtos")
    .select("id, slug, produto_imagens(url, alt, ordem)")
    .eq("ativo", true)
    .in("id", ids);
  if (error || !data) return {};
  const linhas = data as unknown as {
    id: string;
    slug: string;
    produto_imagens: { url: string; alt: string | null; ordem: number }[];
  }[];
  return Object.fromEntries(
    linhas.map((l) => {
      const [primeira] = [...l.produto_imagens].sort(porOrdem);
      return [l.id, { slug: l.slug, imagem: primeira ? { url: primeira.url, alt: primeira.alt } : null }];
    }),
  );
}
