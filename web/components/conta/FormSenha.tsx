"use client";

import { useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import { useTranslations } from "next-intl";
import { alterarSenha, type EstadoForm } from "@/services/minha-conta";
import { KeyRound } from "lucide-react";
import { Retorno, estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import Botao from "@/components/ui/Botao";

const inicial: EstadoForm = { status: "idle" };

export default function FormSenha({ locale }: { locale: string }) {
  const t = useTranslations("conta.seguranca");
  const [estado, action, pendente] = useAcao(alterarSenha, inicial);
  const [mostrar, setMostrar] = useState(false);
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const erros = estado.erros ?? {};
  const tipo = mostrar ? "text" : "password";

  return (
    <form action={action} className="max-w-md space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {(
        [
          ["nova", t("nova"), nova, setNova],
          ["confirmar", t("confirmar"), confirmar, setConfirmar],
        ] as const
      ).map(([id, rotulo, valor, setValor]) => (
        <div key={id}>
          <label htmlFor={id} className={estiloRotulo}>
            {rotulo}
          </label>
          <input
            id={id}
            name={id}
            type={tipo}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            aria-invalid={erros[id] ? true : undefined}
            aria-describedby={erros[id] ? `${id}-erro` : undefined}
            className={estiloCampo}
          />
          {erros[id] ? (
            <p id={`${id}-erro`} className="mt-1 text-sm text-marca-preto">
              {erros[id]}
            </p>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMostrar((m) => !m)}
        aria-pressed={mostrar}
        className="rounded-lg text-sm font-medium text-marca-cinza-600 underline underline-offset-2 hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
      >
        {mostrar ? t("ocultar") : t("mostrar")}
      </button>

      <Retorno estado={estado} pendente={pendente} textoOk={t("alterada")} />
      <Botao type="submit" carregando={pendente} icone={KeyRound} className="px-6">
        {t("salvar")}
      </Botao>
    </form>
  );
}
