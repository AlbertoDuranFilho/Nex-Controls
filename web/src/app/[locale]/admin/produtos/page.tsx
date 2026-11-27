import Image from "next/image";
import { ImageOff, PackageSearch, Pencil, Plus, Upload } from "lucide-react";
import { redirect } from "next/navigation";
import BuscaAdmin from "@/components/admin/BuscaAdmin";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { CelulaAdmin, LinhaAdmin, TabelaAdmin, VazioAdmin } from "@/components/admin/TabelaAdmin";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { imagemNaoOtimizada } from "@/lib/imagem";
import { listarProdutosAdmin } from "@/services/produtos-admin";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ busca?: string | string[] }>;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ListaProdutosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { busca } = await searchParams;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const termo = typeof busca === "string" ? busca : "";
  const produtos = await listarProdutosAdmin(termo);

  return (
    <div>
      <CabecalhoAdmin titulo="Produtos" descricao="Catálogo da loja: códigos, preços e imagens.">
        <Botao href={`/${locale}/admin/produtos/importar`} variante="secundario" icone={Upload}>
          Importar planilha
        </Botao>
        <Botao href={`/${locale}/admin/produtos/novo`} icone={Plus}>
          Novo produto
        </Botao>
      </CabecalhoAdmin>

      <BuscaAdmin termo={termo} placeholder="Código ou nome" />

      {produtos.length === 0 ? (
        <VazioAdmin icone={PackageSearch}>Nenhum produto encontrado.</VazioAdmin>
      ) : (
        <TabelaAdmin
          colunas={["Código", "Nome", "Preço", "Status", <span key="a" className="sr-only">Ações</span>]}
        >
          {produtos.map((p) => (
            <LinhaAdmin key={p.id}>
              <CelulaAdmin rotulo="Código" className="whitespace-nowrap text-marca-cinza-800">
                {p.codigo}
              </CelulaAdmin>
              <CelulaAdmin className="text-marca-preto">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-marca-cinza-100 bg-marca-cinza-50">
                    <Miniatura url={p.imagem} />
                  </span>
                  <span className="min-w-0 font-medium break-words">{p.nome}</span>
                </span>
              </CelulaAdmin>
              <CelulaAdmin rotulo="Preço" className="whitespace-nowrap text-marca-cinza-800">
                {p.preco === null ? "—" : brl.format(p.preco)}
              </CelulaAdmin>
              <CelulaAdmin rotulo="Status">
                <Selo tom={p.ativo ? "verde" : "neutro"}>{p.ativo ? "Ativo" : "Inativo"}</Selo>
              </CelulaAdmin>
              <CelulaAdmin alinhar="direita" className="justify-end">
                <Botao href={`/${locale}/admin/produtos/${p.id}`} variante="fantasma" tamanho="sm" icone={Pencil}>
                  Editar
                </Botao>
              </CelulaAdmin>
            </LinhaAdmin>
          ))}
        </TabelaAdmin>
      )}
    </div>
  );
}

function Miniatura({ url }: { url: string | null }) {
  return url ? (
    <Image src={url} unoptimized={imagemNaoOtimizada(url)} alt="" fill sizes="40px" className="object-contain p-1" />
  ) : (
    <span className="grid h-full place-items-center">
      <ImageOff aria-hidden className="size-4 text-marca-cinza-300" strokeWidth={1.5} />
    </span>
  );
}
