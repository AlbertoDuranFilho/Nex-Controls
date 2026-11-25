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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-32 pb-16 md:flex-row md:gap-10">
      <NavConta locale={locale} trocaSenha={flags.trocaSenha} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
