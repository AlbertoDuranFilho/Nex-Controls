import { redirect } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import VoltarAdmin from "@/components/admin/VoltarAdmin";
import FormCupom from "@/components/admin/FormCupom";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarLojistas } from "@/services/lojistas-admin";

export default async function NovoCupomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const lojistas = (await listarLojistas()).filter((l) => !l.anonimizado);
  return (
    <div>
      <VoltarAdmin href={`/${locale}/admin/cupons`}>Voltar para cupons</VoltarAdmin>
      <CabecalhoAdmin titulo="Novo cupom" descricao="O código é salvo em maiúsculas. Vazio em validade e usos = sem limite." />
      <FormCupom locale={locale} lojistas={lojistas.map((l) => ({ id: l.id, nome: l.nome }))} />
    </div>
  );
}
