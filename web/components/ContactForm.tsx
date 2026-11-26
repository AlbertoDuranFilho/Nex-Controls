"use client";

import { useActionState, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";
import { enviarContato, type EstadoContato } from "@/services/contato";

const inicial: EstadoContato = { estado: "idle" };

const campo =
  "border border-marca-cinza-300 bg-marca-branco px-4 py-2 w-full md:w-60 text-marca-preto outline-none focus:border-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto/20";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [estado, acao, enviando] = useActionState(enviarContato, inicial);
  const [captchaDone, setCaptchaDone] = useState(false);
  const [fechado, setFechado] = useState<EstadoContato | null>(null);

  const modalAberto = (estado.estado === "ok" || estado.estado === "erro") && fechado !== estado;
  const erros = estado.estado === "invalido" ? estado.erros : undefined;

  return (
    <section className="bg-marca-cinza-100 py-10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-2 mb-6">
          {t("title")}
        </h2>

        <form
          id="contato"
          action={acao}
          className="flex flex-col md:flex-row md:flex-wrap items-center gap-4 justify-center"
        >
          <input
            type="text"
            name="nome"
            placeholder={t("form.name")}
            aria-label={t("form.name")}
            required
            maxLength={100}
            aria-invalid={!!erros?.nome}
            className={campo}
          />
          <input
            type="email"
            name="email"
            placeholder={t("form.email")}
            aria-label={t("form.email")}
            required
            aria-invalid={!!erros?.email}
            className={campo}
          />
          <input
            type="tel"
            name="telefone"
            placeholder={t("form.phone")}
            aria-label={t("form.phone")}
            className={campo}
          />
          <textarea
            name="mensagem"
            placeholder={t("form.message")}
            aria-label={t("form.message")}
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            aria-invalid={!!erros?.mensagem}
            className={`${campo} md:w-full`}
          />

          {/* Honeypot: invisível para pessoas, preenchido só por robôs. */}
          <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <input type="text" name="empresa_site" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {erros && (
            <ul role="alert" className="w-full text-left text-sm text-marca-preto">
              {Object.keys(erros).map((k) => (
                <li key={k}>{t(`errors.${k as "nome" | "email" | "mensagem"}`)}</li>
              ))}
            </ul>
          )}

          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string}
            onChange={(v: string | null) => setCaptchaDone(!!v)}
          />

          <button
            type="submit"
            disabled={!captchaDone || enviando}
            className="bg-marca-preto text-marca-branco px-6 py-2 font-semibold cursor-pointer transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500"
          >
            {t("form.submit")}
          </button>
        </form>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-marca-preto/50 flex items-center justify-center z-50">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-marca-branco p-6 shadow-lg w-[90%] max-w-sm text-center"
          >
            <h2 className="text-lg font-bold text-marca-preto mb-4">
              {estado.estado === "ok" ? t("successTitle") : t("errorTitle")}
            </h2>
            <p className="text-marca-cinza-700 mb-6">
              {estado.estado === "ok" ? t("successMessage") : t("errorMessage")}
            </p>
            <button
              onClick={() => setFechado(estado)}
              className="w-full bg-marca-preto text-marca-branco py-2 transition-colors hover:bg-marca-cinza-800"
            >
              {t("okButton")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
