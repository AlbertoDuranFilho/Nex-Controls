"use client";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck } from "lucide-react";
import { classesBotao } from "@/components/ui/Botao";
import type { EstadoForm } from "@/services/minha-conta";

// Mesmo visual de ui/Campo (rounded-xl, foco suave), sem altura fixa: serve a input, select e textarea.
export const estiloCampo =
  "block w-full min-h-12 rounded-xl border border-marca-cinza-200 bg-marca-branco px-4 py-2.5 text-[15px] text-marca-preto " +
  "placeholder:text-marca-cinza-400 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition duration-200 motion-reduce:transition-none " +
  "hover:border-marca-cinza-300 focus:border-marca-preto focus:outline-none focus:ring-4 focus:ring-marca-preto/5 " +
  "disabled:cursor-not-allowed disabled:bg-marca-cinza-50 disabled:text-marca-cinza-500 disabled:hover:border-marca-cinza-200 " +
  "aria-invalid:border-marca-preto aria-invalid:ring-4 aria-invalid:ring-marca-preto/10";
export const estiloRotulo = "mb-1.5 block text-sm font-medium text-marca-cinza-700";
export const estiloBotao = classesBotao("primario", "md", "px-6");

type BaseProps = {
  id: string;
  label: string;
  erro?: string;
};

function Erro({ id, erro }: { id: string; erro?: string }) {
  return erro ? (
    <p id={`${id}-erro`} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-marca-preto">
      <CircleAlert aria-hidden className="size-4 shrink-0" />
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
  placeholder,
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
  placeholder?: string;
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
        placeholder={placeholder}
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
  const ok = !pendente && estado.status === "ok";
  const falhou = !pendente && estado.status === "erro";
  return (
    <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm font-medium text-marca-preto">
      {ok && <CircleCheck aria-hidden className="size-4 shrink-0" />}
      {falhou && <CircleAlert aria-hidden className="size-4 shrink-0" />}
      {texto}
    </p>
  );
}
