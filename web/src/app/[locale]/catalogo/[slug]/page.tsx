import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import ProdutoDetalhe from "@/components/ProdutoDetalhe";
import { routing } from "../../../../i18n/routing";
import { listarSlugsAtivos, obterProdutoPorSlug } from "@/services/catalogo";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await listarSlugsAtivos();
    return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
  } catch (e) {
    // Sem banco no build: as páginas são geradas sob demanda.
    console.warn("generateStaticParams do catálogo ignorado:", e);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const produto = await obterProdutoPorSlug(slug);
  if (!produto) return {};
  return {
    title: `${produto.nome} - Nex Controls`,
    description: produto.destaque ?? undefined,
  };
}

export default async function ProdutoPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const produto = await obterProdutoPorSlug(slug);
  if (!produto) notFound();

  return (
    // pt-32 = navbar fixa (pt-24) + respiro.
    <div className="mx-auto max-w-7xl px-4 pt-32 pb-16 sm:px-6">
      <ProdutoDetalhe produto={produto} />
    </div>
  );
}
