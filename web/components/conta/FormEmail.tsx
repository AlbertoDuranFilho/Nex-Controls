"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { alterarEmail, type EstadoForm } from "@/services/minha-conta";
import { Campo, Retorno, estiloBotao } from "@/components/conta/Campo";

const inicial: EstadoForm = { status: "idle" };

export default function FormEmail({
  locale,
  email,
  emailPendente,
}: {
  locale: string;
  email: string;
  emailPendente: string | null;
}) {
  const t = useTranslations("conta.email");
  const [estado, action, pendente] = useActionState(alterarEmail, inicial);
  const [novo, setNovo] = useState("");
  const erros = estado.erros ?? {};

  return (
    <section aria-labelledby="titulo-email" className="space-y-4 border-t border-marca-cinza-200 pt-8">
      <h2 id="titulo-email" className="text-lg font-bold text-marca-preto">
        {t("titulo")}
      </h2>
      <p className="text-sm text-marca-cinza-700">
        {t("atual")}: <strong className="font-semibold text-marca-preto">{email}</strong>
      </p>
      {emailPendente ? (
        <div className="border border-marca-cinza-300 bg-marca-cinza-50 p-4 text-sm text-marca-preto">
          <p>{t("aguardando")}</p>
          <p className="mt-1">
            <strong className="font-semibold">{emailPendente}</strong>
          </p>
        </div>
      ) : null}

      <form action={action} className="max-w-md space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Campo
          id="email"
          label={t("novo")}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={novo}
          onChange={setNovo}
          required
          maxLength={254}
          erro={erros.email}
        />
        <Retorno estado={estado} pendente={pendente} textoOk={t("enviado")} />
        <button type="submit" disabled={pendente} className={estiloBotao}>
          {t("alterar")}
        </button>
      </form>
    </section>
  );
}
