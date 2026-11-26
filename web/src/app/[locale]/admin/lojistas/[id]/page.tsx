import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import Selo from "@/components/ui/Selo";
import AcoesLojista from "@/components/admin/AcoesLojista";
import { FormEditarLojista } from "@/components/admin/FormLojista";
import DescontosProduto from "@/components/admin/DescontosProduto";
import { listarDescontosProduto } from "@/services/descontos-admin";
import { listarProdutosAdmin } from "@/services/produtos-admin";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { UUID } from "@/lib/admin/formulario";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditarLojistaPage({ params }: Props) {
  const { locale, id } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  if (!UUID.test(id)) notFound();

  const { data: l } = await createAdminClient()
    .from("lojistas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!l) notFound();

  const anonimizado = l.anonimizado_em !== null;
  const status = anonimizado ? "Anonimizado" : l.ativo ? "Ativo" : "Inativo";

  return (
    <div className="space-y-6">
      <div>
        <VoltarAdmin href={`/${locale}/admin/lojistas`}>Voltar para clientes</VoltarAdmin>
        <CabecalhoAdmin titulo={l.nome} descricao={l.email} className="">
          <Selo tom={!anonimizado && l.ativo ? "verde" : "neutro"} data-testid="status-cliente">
            {status}
          </Selo>
        </CabecalhoAdmin>
      </div>

      {anonimizado ? null : (
        <FormEditarLojista
          dados={{
            id: l.id,
            tipo_pessoa: l.tipo_pessoa,
            documento: l.documento ?? "",
            nome: l.nome,
            email: l.email,
            desconto_percentual: Number(l.desconto_percentual),
            nome_fantasia: l.nome_fantasia,
            inscricao_estadual: l.inscricao_estadual,
            indicador_ie: l.indicador_ie,
            responsavel_nome: l.responsavel_nome,
            telefone: l.telefone,
            whatsapp: l.whatsapp,
            cep: l.cep,
            logradouro: l.logradouro,
            numero: l.numero,
            complemento: l.complemento,
            bairro: l.bairro,
            cidade: l.cidade,
            uf: l.uf,
          }}
        />
      )}

      {anonimizado ? null : (
        <DescontosProduto
            lojistaId={l.id}
            descontos={await listarDescontosProduto(l.id)}
            produtos={(await listarProdutosAdmin()).map((p) => ({ id: p.id, codigo: p.codigo, nome: p.nome }))}
          />
      )}

      <AcoesLojista id={l.id} ativo={l.ativo} anonimizado={anonimizado} documento={l.documento} />
    </div>
  );
}
