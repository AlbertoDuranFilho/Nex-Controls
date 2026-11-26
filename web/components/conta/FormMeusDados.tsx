"use client";

import { useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import { useTranslations } from "next-intl";
import { salvarMeusDados, type EstadoForm } from "@/services/minha-conta";
import { formatarDocumento } from "@/lib/validacao/documento";
import { mascaraTelefone } from "@/lib/conta/campos";
import { Save } from "lucide-react";
import { Campo, Retorno, Seletor } from "@/components/conta/Campo";
import Botao from "@/components/ui/Botao";

export type DadosCadastrais = {
  nome: string;
  documento: string | null;
  nome_fantasia: string | null;
  responsavel_nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  inscricao_estadual: string | null;
  indicador_ie: "contribuinte" | "isento" | "nao_contribuinte";
};

const inicial: EstadoForm = { status: "idle" };

export default function FormMeusDados({ locale, dados }: { locale: string; dados: DadosCadastrais }) {
  const t = useTranslations("conta.dados");
  const [estado, action, pendente] = useAcao(salvarMeusDados, inicial);
  // Controlados: o React 19 limpa campos não controlados depois de uma action de formulário.
  const [v, setV] = useState({
    nome_fantasia: dados.nome_fantasia ?? "",
    responsavel_nome: dados.responsavel_nome ?? "",
    telefone: mascaraTelefone(dados.telefone),
    whatsapp: mascaraTelefone(dados.whatsapp),
    inscricao_estadual: dados.inscricao_estadual ?? "",
    indicador_ie: dados.indicador_ie,
  });
  const set = (campo: keyof typeof v) => (valor: string) => setV((a) => ({ ...a, [campo]: valor }));
  const erros = estado.erros ?? {};
  const contribuinte = v.indicador_ie === "contribuinte";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="documento"
          label={t("documento")}
          value={dados.documento ? formatarDocumento(dados.documento) : ""}
          disabled
        />
        <Campo id="nome" label={t("nome")} value={dados.nome} disabled />
        <Campo
          id="nome_fantasia"
          label={t("nomeFantasia")}
          value={v.nome_fantasia}
          onChange={set("nome_fantasia")}
          autoComplete="organization"
          maxLength={120}
          erro={erros.nome_fantasia}
        />
        <Campo
          id="responsavel_nome"
          label={t("responsavel")}
          value={v.responsavel_nome}
          onChange={set("responsavel_nome")}
          autoComplete="name"
          maxLength={120}
          erro={erros.responsavel_nome}
        />
        <Campo
          id="telefone"
          label={t("telefone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={v.telefone}
          onChange={(x) => set("telefone")(mascaraTelefone(x))}
          erro={erros.telefone}
        />
        <Campo
          id="whatsapp"
          label={t("whatsapp")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={v.whatsapp}
          onChange={(x) => set("whatsapp")(mascaraTelefone(x))}
          erro={erros.whatsapp}
        />
        <Seletor
          id="indicador_ie"
          label={t("indicadorIe")}
          value={v.indicador_ie}
          onChange={set("indicador_ie")}
          erro={erros.indicador_ie}
        >
          <option value="contribuinte">{t("contribuinte")}</option>
          <option value="isento">{t("isento")}</option>
          <option value="nao_contribuinte">{t("naoContribuinte")}</option>
        </Seletor>
        <Campo
          id="inscricao_estadual"
          label={t("inscricaoEstadual")}
          value={v.inscricao_estadual}
          onChange={set("inscricao_estadual")}
          required={contribuinte}
          disabled={!contribuinte}
          maxLength={30}
          erro={erros.inscricao_estadual}
        />
      </div>

      <Retorno estado={estado} pendente={pendente} />
      <Botao type="submit" carregando={pendente} icone={Save} className="px-6">
        {t("salvar")}
      </Botao>
    </form>
  );
}
