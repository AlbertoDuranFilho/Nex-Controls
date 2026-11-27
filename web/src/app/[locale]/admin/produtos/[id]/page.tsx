import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import FormProduto from "@/components/admin/FormProduto";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { obterProdutoAdmin } from "@/services/produtos-admin";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditarProdutoPage({ params }: Props) {
  const { locale, id } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const produto = await obterProdutoAdmin(id);
  if (!produto) notFound();

  return (
    <div>
      <VoltarAdmin href={`/${locale}/admin/produtos`}>Voltar para produtos</VoltarAdmin>
      <CabecalhoAdmin titulo={produto.nome} descricao={`Código ${produto.codigo}`}>
        <Selo tom={produto.ativo ? "verde" : "neutro"} className="self-center">
          {produto.ativo ? "Ativo" : "Inativo"}
        </Selo>
        {produto.ativo ? (
          <Botao href={`/${locale}/catalogo/${produto.slug}`} variante="secundario" tamanho="sm" icone={ExternalLink}>
            Ver no catálogo
          </Botao>
        ) : null}
      </CabecalhoAdmin>
      <FormProduto key={produto.id} produto={produto} locale={locale} />
    </div>
  );
}
