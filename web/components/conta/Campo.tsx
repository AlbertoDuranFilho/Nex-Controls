"use client";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import type { EstadoForm } from "@/services/minha-conta";

export const estiloCampo =
  "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto/20 disabled:bg-marca-cinza-100 disabled:text-marca-cinza-600";
export const estiloRotulo = "mb-1 block text-sm font-medium text-marca-cinza-800";
export const estiloBotao =
  "bg-marca-preto px-6 py-3 font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500";

type BaseProps = {
  id: string;
  label: string;
  erro?: string;
};

function Erro({ id, erro }: { id: string; erro?: string }) {
  return erro ? (
    <p id={`${id}-erro`} className="mt-1 text-sm text-marca-preto">
      {erro}
    </p>
  ) : null;
}

export function Campo({
  id,
  label,
  erro,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  required,
  disabled,
  maxLength,
  inputRef,
}: BaseProps & {
  value: string;
  onChange?: (valor: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div>
      <label htmlFor={id} className={estiloRotulo}>
        {label}
      </label>
      <input
        id={id}
        name={disabled ? undefined : id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={disabled}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={estiloCampo}
      />
      <Erro id={id} erro={erro} />
    </div>
  );
}

export function Seletor({
  id,
  label,
  erro,
  value,
  onChange,
  autoComplete,
  required,
  children,
}: BaseProps & {
  value: string;
  onChange: (valor: string) => void;
  autoComplete?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={estiloRotulo}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={estiloCampo}
      >
        {children}
      </select>
      <Erro id={id} erro={erro} />
    </div>
  );
}

// "Salvando…" / "Salvo" / mensagem de erro. Região viva para leitores de tela.
export function Retorno({
  estado,
  pendente,
  textoOk,
}: {
  estado: EstadoForm;
  pendente: boolean;
  textoOk?: string;
}) {
  const t = useTranslations("conta.estado");
  let texto = "";
  if (pendente) texto = t("salvando");
  else if (estado.status === "ok") texto = textoOk ?? t("salvo");
  else if (estado.status === "erro") texto = estado.mensagem ?? t("erro");
  return (
    <p role="status" aria-live="polite" className="min-h-5 text-sm text-marca-preto">
      {texto}
    </p>
  );
}
