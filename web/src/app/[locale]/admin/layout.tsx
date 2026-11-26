import Link from "next/link";
import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/auth/exigir-admin";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Painel só em português (uso interno). O middleware só redireciona; a checagem
// de verdade (papel + profiles.is_admin) é esta, e de novo em cada Server Action.
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);

  const link = "text-marca-cinza-600 underline-offset-2 hover:text-marca-preto hover:underline";
  return (
    <div className="mx-auto max-w-5xl px-6 pt-32 pb-16">
      <nav aria-label="Administração" className="mb-8 flex gap-6 border-b border-marca-cinza-200 pb-3 text-sm">
        <Link href={`/${locale}/admin/lojistas`} className={link}>
          Clientes
        </Link>
        <Link href={`/${locale}/admin/produtos`} className={link}>
          Produtos
        </Link>
        <Link href={`/${locale}/admin/cupons`} className={link}>
          Cupons
        </Link>
        <Link href={`/${locale}/admin/pedidos`} className={link}>
          Pedidos
        </Link>
      </nav>
      {children}
    </div>
  );
}
