import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import CartaoConta, { CabecalhoConta } from "@/components/conta/CartaoConta";
import FormEndereco from "@/components/conta/FormEndereco";
import { obterMeuCadastro } from "@/lib/conta/meu-cadastro";

type Props = { params: Promise<{ locale: string }> };

export default async function EnderecoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conta.endereco" });
  const cadastro = await obterMeuCadastro();

  return (
    <div className="space-y-6">
      <CabecalhoConta icone={MapPin} titulo={t("titulo")}>
        {t("descricao")}
      </CabecalhoConta>
      <CartaoConta>
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
      </CartaoConta>
    </div>
  );
}
