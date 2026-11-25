import { getTranslations } from "next-intl/server";
import FormEmail from "@/components/conta/FormEmail";
import FormMeusDados from "@/components/conta/FormMeusDados";
import { obterMeuCadastro } from "@/lib/conta/meu-cadastro";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string | string[] }>;
};

const RETORNOS = ["confirmado", "pendente", "erro"] as const;

export default async function MeusDadosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { email } = await searchParams;
  const t = await getTranslations({ locale, namespace: "conta" });
  const cadastro = await obterMeuCadastro();
  const retorno = RETORNOS.find((r) => r === email);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-marca-preto">{t("dados.titulo")}</h1>
        <p className="mt-1 text-sm text-marca-cinza-600">
          <span data-testid="area-cliente-nome">{cadastro.nome}</span>
        </p>
      </div>

      {retorno ? (
        <p role="status" className="border border-marca-cinza-300 bg-marca-cinza-50 p-4 text-sm text-marca-preto">
          {t(`email.retorno.${retorno}`)}
        </p>
      ) : null}

      <FormMeusDados
        locale={locale}
        dados={{
          nome: cadastro.nome,
          documento: cadastro.documento,
          nome_fantasia: cadastro.nome_fantasia,
          responsavel_nome: cadastro.responsavel_nome,
          telefone: cadastro.telefone,
          whatsapp: cadastro.whatsapp,
          inscricao_estadual: cadastro.inscricao_estadual,
          indicador_ie: cadastro.indicador_ie,
        }}
      />
      <FormEmail locale={locale} email={cadastro.email} emailPendente={cadastro.emailPendente} />
    </div>
  );
}
