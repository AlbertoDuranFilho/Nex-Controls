import Link from "next/link";
import { redirect } from "next/navigation";
import FormCupom from "@/components/admin/FormCupom";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarLojistas } from "@/services/lojistas-admin";

export default async function NovoCupomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const lojistas = (await listarLojistas()).filter((l) => !l.anonimizado);
  return (
    <div>
      <Link href={`/${locale}/admin/cupons`} className="text-sm text-marca-cinza-600 hover:text-marca-preto">
        ← Cupons
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-marca-preto">Novo cupom</h1>
      <FormCupom locale={locale} lojistas={lojistas.map((l) => ({ id: l.id, nome: l.nome }))} />
    </div>
  );
}
