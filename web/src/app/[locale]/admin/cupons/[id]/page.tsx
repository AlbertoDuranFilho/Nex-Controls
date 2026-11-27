import { notFound, redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import Selo from "@/components/ui/Selo";
import FormCupom from "@/components/admin/FormCupom";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { obterCupom } from "@/services/cupons-admin";
import { listarLojistas } from "@/services/lojistas-admin";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditarCupomPage({ params }: Props) {
  const { locale, id } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const cupom = await obterCupom(id);
  if (!cupom) notFound();
  const lojistas = (await listarLojistas()).filter((l) => !l.anonimizado || l.id === cupom.lojista_id);

  return (
    <div>
      <VoltarAdmin href={`/${locale}/admin/cupons`}>Voltar para cupons</VoltarAdmin>
      <CabecalhoAdmin titulo={cupom.codigo} descricao={`Usos: ${cupom.usos} / ${cupom.max_usos ?? "ilimitado"}`}>
        <Selo tom={cupom.ativo ? "verde" : "neutro"}>{cupom.ativo ? "Ativo" : "Inativo"}</Selo>
      </CabecalhoAdmin>
      <FormCupom key={cupom.id} cupom={cupom} locale={locale} lojistas={lojistas.map((l) => ({ id: l.id, nome: l.nome }))} />
    </div>
  );
}
