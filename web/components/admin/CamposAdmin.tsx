"use client";

import type { ReactNode, Ref, SelectHTMLAttributes } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import { aplicarMascara, semVirgulaFinal } from "@/lib/mascaras";

// Campos dos formulários do admin: mesmo visual da área do cliente (rounded-xl, foco preto).
// Não controlados (defaultValue); a máscara reescreve o valor no próprio input a cada digitação.

export type Mascara = (valor: string) => string;

type CampoAdminProps = {
  id: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel" | "decimal" | "email" | "url" | "text";
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  mascara?: Mascara;
  /** Texto fixo dentro do campo, à direita (ex.: "%"). */
  sufixo?: string;
  /** Sem `name`, só leitura (ex.: documento na edição). */
  somenteLeitura?: boolean;
  aoMudar?: (valor: string) => void;
  className?: string;
};

export function CampoAdmin({
  id,
  label,
  defaultValue,
  type = "text",
  mascara,
  sufixo,
  somenteLeitura,
  aoMudar,
  className = "",
  ...resto
}: CampoAdminProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={estiloRotulo}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={somenteLeitura ? undefined : id}
          type={type}
          defaultValue={defaultValue ?? ""}
          disabled={somenteLeitura}
          readOnly={somenteLeitura}
          onChange={(e) => {
            if (mascara) aplicarMascara(e.currentTarget, mascara);
            aoMudar?.(e.currentTarget.value);
          }}
          onBlur={(e) => {
            // "5," vira "5" ao sair do campo (o servidor recusa a vírgula pendurada).
            if (mascara) e.currentTarget.value = semVirgulaFinal(e.currentTarget.value);
          }}
          className={`${estiloCampo} ${sufixo ? "pr-10" : ""}`.trim()}
          {...resto}
        />
        {sufixo ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-marca-cinza-500"
          >
            {sufixo}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SeletorAdmin({
  id,
  label,
  className = "",
  children,
  ref,
  ...resto
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLSelectElement>;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className" | "children">) {
  return (
    <div className={className}>
      <label htmlFor={id} className={estiloRotulo}>
        {label}
      </label>
      <select ref={ref} id={id} name={resto.name ?? id} className={estiloCampo} {...resto}>
        {children}
      </select>
    </div>
  );
}

export function AreaAdmin({
  id,
  label,
  defaultValue,
  className = "",
}: {
  id: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={estiloRotulo}>
        {label}
      </label>
      <textarea id={id} name={id} rows={4} defaultValue={defaultValue ?? ""} className={estiloCampo} />
    </div>
  );
}

export function CaixaSelecao({ name, defaultChecked, children }: { name: string; defaultChecked: boolean; children: ReactNode }) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-marca-cinza-200 bg-marca-cinza-50 px-4 py-3 text-sm font-medium text-marca-preto">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-marca-preto" />
      {children}
    </label>
  );
}

// Mensagem de retorno em caixa arredondada. A região viva fica sempre no DOM (leitores de tela).
export function AvisoAdmin({
  tipo,
  children,
  papel = "alert",
  className = "",
}: {
  tipo: "ok" | "erro";
  children?: ReactNode;
  papel?: "alert" | "status";
  className?: string;
}) {
  const Icone = tipo === "ok" ? CircleCheck : CircleAlert;
  return (
    <div role={papel} className={className}>
      {children ? (
        <p
          className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
            tipo === "ok"
              ? "bg-marca-preto text-marca-branco"
              : "border border-marca-cinza-300 bg-marca-cinza-50 text-marca-preto"
          }`}
        >
          <Icone aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{children}</span>
        </p>
      ) : null}
    </div>
  );
}

// Antes de enviar: tira a vírgula pendurada dos campos decimais ("5," → "5").
export function semVirgulaPendurada(form: FormData, campos: string[]): FormData {
  for (const c of campos) {
    const v = form.get(c);
    if (typeof v === "string") form.set(c, semVirgulaFinal(v));
  }
  return form;
}

// Troca os campos mascarados pelos dígitos antes de enviar (o servidor também limpa).
export function soDigitos(form: FormData, campos: string[]): FormData {
  for (const c of campos) {
    const v = form.get(c);
    if (typeof v === "string") form.set(c, v.replace(/\D/g, ""));
  }
  return form;
}
