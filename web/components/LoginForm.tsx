"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { entrar, type EstadoLogin } from "@/services/auth";

const inicial: EstadoLogin = { erro: null };

export default function LoginForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("login");
  const [estado, action, pendente] = useActionState(entrar, inicial);
  const [mostrar, setMostrar] = useState(false);

  const campo =
    "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-marca-cinza-800">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium text-marca-cinza-800">
          {t("password")}
        </label>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={mostrar ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${campo} pr-24`}
          />
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            aria-pressed={mostrar}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-marca-cinza-600 hover:text-marca-preto"
          >
            {mostrar ? t("ocultarSenha") : t("mostrarSenha")}
          </button>
        </div>
      </div>

      <p role="alert" className="min-h-5 text-sm text-marca-preto">
        {estado.erro}
      </p>

      <button
        type="submit"
        disabled={pendente}
        className="w-full bg-marca-preto py-3 font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500"
      >
        {t("submit")}
      </button>
    </form>
  );
}
