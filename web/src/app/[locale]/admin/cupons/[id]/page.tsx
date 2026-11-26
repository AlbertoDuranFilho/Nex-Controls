import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin/cupons`} className="text-sm text-marca-cinza-600 hover:text-marca-preto">
          ← Cupons
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-marca-preto">{cupom.codigo}</h1>
        <p className="mt-1 text-sm text-marca-cinza-600">
          Usos: {cupom.usos} / {cupom.max_usos ?? "ilimitado"}
        </p>
      </div>
      <FormCupom key={cupom.id} cupom={cupom} locale={locale} lojistas={lojistas.map((l) => ({ id: l.id, nome: l.nome }))} />
    </div>
  );
}
