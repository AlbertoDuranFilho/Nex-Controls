import { getTranslations } from "next-intl/server";
import FormEndereco from "@/components/conta/FormEndereco";
import { obterMeuCadastro } from "@/lib/conta/meu-cadastro";

type Props = { params: Promise<{ locale: string }> };

export default async function EnderecoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta.endereco" });
  const cadastro = await obterMeuCadastro();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-marca-preto">{t("titulo")}</h1>
      <FormEndereco
        locale={locale}
        dados={{
          cep: cadastro.cep,
          logradouro: cadastro.logradouro,
          numero: cadastro.numero,
          complemento: cadastro.complemento,
          bairro: cadastro.bairro,
          cidade: cadastro.cidade,
          uf: cadastro.uf,
        }}
      />
    </div>
  );
}
