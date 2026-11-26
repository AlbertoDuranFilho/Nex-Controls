"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sair } from "@/services/auth";

type Sessao = { nome: string; admin: boolean } | null;

function daSessao(
  user: { app_metadata?: Record<string, unknown> } | null | undefined,
): Sessao {
  if (!user) return null;
  const meta = user.app_metadata ?? {};
  return {
    nome: typeof meta.nome === "string" ? meta.nome : "",
    admin: meta.papel === "admin",
  };
}

// Ilha client: o layout nao le cookies. getSession() e local (sem rede).
// `onNavegar` avisa o pai (ex.: drawer mobile) quando um link e clicado.
export default function MenuUsuario({ onNavegar }: { onNavegar?: () => void }) {
  const t = useTranslations("menuUsuario");
  const locale = useLocale();
  const pathname = usePathname();
  // undefined = ainda nao sabemos (evita piscar "Entrar" para quem esta logado)
  const [sessao, setSessao] = useState<Sessao | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;
    // Re-le a cada navegacao: login/logout via Server Action nao remontam a ilha.
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setSessao(daSessao(data.session?.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      if (ativo) setSessao(daSessao(s?.user));
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  // Caixa reservada, alinhada a direita: a troca de conteudo nao move os vizinhos.
  const base = "flex min-h-9 min-w-72 items-center justify-end gap-3 text-sm";
  const link =
    "text-marca-cinza-600 underline-offset-2 hover:text-marca-preto hover:underline";

  if (sessao === undefined) {
    return <div className={base} aria-hidden="true" />;
  }

  if (!sessao) {
    return (
      <div className={base}>
        <Link
          href={`/${locale}/cliente/login`}
          onClick={onNavegar}
          className="border border-marca-preto px-3 py-1.5 font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
        >
          {t("entrar")}
        </Link>
      </div>
    );
  }

  return (
    <div className={base}>
      <span className="font-medium text-marca-preto">{t("ola", { nome: sessao.nome })}</span>
      <Link
        href={sessao.admin ? `/${locale}/admin/lojistas` : `/${locale}/cliente`}
        onClick={onNavegar}
        className={link}
      >
        {sessao.admin ? t("admin") : t("minhaConta")}
      </Link>
      <form action={() => sair(locale)}>
        <button type="submit" className={link}>
          {t("sair")}
        </button>
      </form>
    </div>
  );
}
