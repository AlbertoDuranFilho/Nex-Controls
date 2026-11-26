"use client";

import { useAcao } from "@/lib/react/destravar-transicao";
import { useTranslations } from "next-intl";
import { CircleAlert, LogIn, Mail } from "lucide-react";
import { entrar, type EstadoLogin } from "@/services/auth";
import Botao from "@/components/ui/Botao";
import Campo from "@/components/ui/Campo";
import CampoSenha from "@/components/ui/CampoSenha";

const inicial: EstadoLogin = { erro: null };

export default function LoginForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("login");
  const [estado, action, pendente] = useAcao(entrar, inicial);

  const rotulo = "mb-2 block text-sm font-medium text-marca-cinza-800";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className={rotulo}>
          {t("email")}
        </label>
        <Campo
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          required
          icone={Mail}
        />
      </div>

      <div>
        <label htmlFor="senha" className={rotulo}>
          {t("password")}
        </label>
        <CampoSenha
          id="senha"
          name="senha"
          autoComplete="current-password"
          required
        />
      </div>

      <p
        role="alert"
        className={
          estado.erro
            ? "flex items-center gap-2 rounded-xl bg-marca-cinza-100 px-4 py-3 text-sm font-medium text-marca-preto ring-1 ring-marca-cinza-300 ring-inset"
            : "sr-only"
        }
      >
        {estado.erro && <CircleAlert aria-hidden className="size-4 shrink-0" />}
        {estado.erro}
      </p>

      <Botao type="submit" tamanho="lg" icone={LogIn} carregando={pendente} className="w-full">
        {t("submit")}
      </Botao>
    </form>
  );
}
