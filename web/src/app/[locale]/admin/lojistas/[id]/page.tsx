import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <div className="space-y-8">
      <div>
        <Link
          href={`/${locale}/admin/lojistas`}
          className="text-sm text-marca-cinza-600 hover:text-marca-preto"
        >
          ← Clientes
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-marca-preto">{l.nome}</h1>
        <p className="mt-1 text-sm text-marca-cinza-600">
          Status: <span data-testid="status-cliente" className="font-medium text-marca-preto">{status}</span>
        </p>
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
        <div className="border-t border-marca-cinza-200 pt-8">
          <DescontosProduto
            lojistaId={l.id}
            descontos={await listarDescontosProduto(l.id)}
            produtos={(await listarProdutosAdmin()).map((p) => ({ id: p.id, codigo: p.codigo, nome: p.nome }))}
          />
        </div>
      )}

      <div className={anonimizado ? "" : "border-t border-marca-cinza-200 pt-8"}>
        <AcoesLojista
          id={l.id}
          ativo={l.ativo}
          anonimizado={anonimizado}
          documento={l.documento}
        />
      </div>
    </div>
  );
}
