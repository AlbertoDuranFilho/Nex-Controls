"use client";

import { useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import { useTranslations } from "next-intl";
import { Clock, Mail, Send } from "lucide-react";
import { alterarEmail, type EstadoForm } from "@/services/minha-conta";
import { Campo, Retorno } from "@/components/conta/Campo";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";

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
  const [estado, action, pendente] = useAcao(alterarEmail, inicial);
  const [novo, setNovo] = useState("");
  const erros = estado.erros ?? {};

  return (
    <CartaoConta
      titulo={t("titulo")}
      idTitulo="titulo-email"
      icone={Mail}
      descricao={
        <>
          {t("atual")}: <strong className="font-semibold break-all text-marca-preto">{email}</strong>
        </>
      }
    >
      {emailPendente ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-marca-cinza-200 bg-marca-cinza-50 p-4 text-sm text-marca-preto">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p>{t("aguardando")}</p>
            <p className="mt-1">
              <strong className="font-semibold break-all">{emailPendente}</strong>
            </p>
          </div>
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
        <Botao type="submit" carregando={pendente} icone={Send} className="px-6">
          {t("alterar")}
        </Botao>
      </form>
    </CartaoConta>
  );
}
