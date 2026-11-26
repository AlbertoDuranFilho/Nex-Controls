import { getTranslations } from "next-intl/server";
import { Building2, CircleCheck, Info, UserRound } from "lucide-react";
import CartaoConta, { CabecalhoConta } from "@/components/conta/CartaoConta";
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
  const IconeRetorno = retorno === "confirmado" ? CircleCheck : Info;

  return (
    <div className="space-y-6">
      <CabecalhoConta icone={UserRound} titulo={t("dados.titulo")}>
        <span data-testid="area-cliente-nome">{cadastro.nome}</span>
      </CabecalhoConta>

      {retorno ? (
        <p
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-4 text-sm text-marca-preto shadow-sm"
        >
          <IconeRetorno aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t(`email.retorno.${retorno}`)}
        </p>
      ) : null}

      <CartaoConta
        titulo={t("dados.secao")}
        idTitulo="titulo-dados"
        icone={Building2}
        descricao={t("dados.secaoDescricao")}
      >
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
      </CartaoConta>
      <FormEmail locale={locale} email={cadastro.email} emailPendente={cadastro.emailPendente} />
    </div>
  );
}
