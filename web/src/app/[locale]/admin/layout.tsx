import { redirect } from "next/navigation";
import MenuAdmin from "@/components/admin/MenuAdmin";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { contarAguardandoPagamento } from "@/services/resumo-admin";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Painel só em português (uso interno). O middleware só redireciona; a checagem
// de verdade (papel + profiles.is_admin) é esta, e de novo em cada Server Action.
// Shell próprio: o topo e o rodapé do site somem aqui (Navbar / OcultarNoAdmin).
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const aguardando = await contarAguardandoPagamento();

  return (
    <div className="min-h-screen bg-marca-cinza-50">
      <MenuAdmin locale={locale} aguardando={aguardando} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
