import { redirect } from "next/navigation";
import NavConta from "@/components/conta/NavConta";
import { getUsuarioAtual } from "@/lib/auth/usuario-atual";
import { buscarMeuCadastro } from "@/lib/conta/meu-cadastro";
import { flags } from "@/lib/flags";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Área do lojista. O middleware só redireciona; a checagem de verdade é esta (e a RLS).
export default async function AreaClienteLayout({ children, params }: Props) {
  const { locale } = await params;
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect(`/${locale}/cliente/login`);
  if (usuario.papel === "admin") redirect(`/${locale}/admin/lojistas`);
  const cadastro = await buscarMeuCadastro();
  if (!cadastro) redirect(`/${locale}`);
  // Anonimizado com JWT ainda válido (o ban só barra novos tokens): fora da área.
  if (cadastro.anonimizado_em) redirect(`/${locale}`);

  return (
    <div className="min-h-screen bg-marca-cinza-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-28 pb-16 sm:px-6 md:flex-row md:items-start md:gap-8 md:pt-32">
        <NavConta locale={locale} trocaSenha={flags.trocaSenha} nome={cadastro.nome} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
