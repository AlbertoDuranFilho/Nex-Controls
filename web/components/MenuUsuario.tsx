"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Package,
  User,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { classesBotao } from "@/components/ui/Botao";
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

const itemMenu =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-marca-cinza-700 transition-colors duration-150 " +
  "hover:bg-marca-cinza-100 hover:text-marca-preto focus-visible:bg-marca-cinza-100 focus-visible:text-marca-preto " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none";

type Item = { href: string; rotulo: string; icone: LucideIcon };

// Ilha client: o layout nao le cookies. getSession() e local (sem rede).
// Desktop: botao "Ola, nome" que abre um painel. `onNavegar` (drawer mobile) mostra a lista aberta
// e avisa o pai quando um link e clicado.
export default function MenuUsuario({ onNavegar }: { onNavegar?: () => void }) {
  const t = useTranslations("menuUsuario");
  const locale = useLocale();
  const pathname = usePathname();
  const idPainel = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  // undefined = ainda nao sabemos (evita piscar "Entrar" para quem esta logado)
  const [sessao, setSessao] = useState<Sessao | undefined>(undefined);
  const [aberto, setAberto] = useState(false);
  const lista = !!onNavegar;

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

  useEffect(() => setAberto(false), [pathname]);

  // Fecha com clique fora e Esc (devolve o foco ao botao).
  useEffect(() => {
    if (!aberto) return;
    function fora(e: PointerEvent) {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        gatilho.current?.focus();
      }
    }
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  if (sessao === undefined) {
    return lista ? (
      <div className="h-12" aria-hidden="true" />
    ) : (
      <div className="h-11 w-40 animate-pulse rounded-xl bg-marca-cinza-100 motion-reduce:animate-none" aria-hidden="true" />
    );
  }

  if (!sessao) {
    return (
      <Link
        href={`/${locale}/cliente/login`}
        onClick={onNavegar}
        className={classesBotao(lista ? "primario" : "secundario", lista ? "lg" : "md", lista ? "w-full" : "px-4")}
      >
        <LogIn aria-hidden className="size-4" />
        {t("entrar")}
      </Link>
    );
  }

  const itens: Item[] = sessao.admin
    ? [{ href: `/${locale}/admin/lojistas`, rotulo: t("admin"), icone: LayoutDashboard }]
    : [
        { href: `/${locale}/catalogo`, rotulo: t("catalogo"), icone: LayoutGrid },
        { href: `/${locale}/cliente/pedidos`, rotulo: t("pedidos"), icone: Package },
        { href: `/${locale}/cliente`, rotulo: t("minhaConta"), icone: UserCog },
      ];
  const fechar = () => {
    setAberto(false);
    onNavegar?.();
  };

  const conteudo = (
    <>
      <ul className="space-y-0.5">
        {itens.map(({ href, rotulo, icone: Icone }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={fechar}
              aria-current={pathname === href ? "page" : undefined}
              className={`${itemMenu} aria-[current=page]:text-marca-preto`}
            >
              <Icone aria-hidden className="size-[18px] text-marca-cinza-500" strokeWidth={1.75} />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
      <div className="my-1.5 border-t border-marca-cinza-100" />
      <form action={() => sair(locale)}>
        <button type="submit" className={itemMenu}>
          <LogOut aria-hidden className="size-[18px] text-marca-cinza-500" strokeWidth={1.75} />
          {t("sair")}
        </button>
      </form>
    </>
  );

  const avatar = (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-preto text-marca-branco"
    >
      <User className="size-4" strokeWidth={2} />
    </span>
  );

  if (lista) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-3 px-3">
          {avatar}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-marca-preto">{t("ola", { nome: sessao.nome })}</p>
            <p className="text-xs text-marca-cinza-500">{sessao.admin ? t("admin") : t("areaCliente")}</p>
          </div>
        </div>
        {conteudo}
      </div>
    );
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className={`flex h-11 max-w-64 items-center gap-2.5 rounded-xl border py-1.5 pr-2.5 pl-1.5 text-sm font-medium text-marca-preto transition duration-200 hover:border-marca-cinza-300 hover:bg-marca-cinza-50 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none motion-reduce:transition-none ${
          aberto ? "border-marca-cinza-300 bg-marca-cinza-50" : "border-marca-cinza-200"
        }`}
      >
        {avatar}
        <span className="sr-only lg:not-sr-only lg:min-w-0 lg:truncate lg:whitespace-nowrap">{t("ola", { nome: sessao.nome })}</span>
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-marca-cinza-500 transition-transform duration-200 motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      {aberto && (
        <div
          id={idPainel}
          className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-marca-cinza-200 bg-marca-branco p-2 shadow-elevada"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="text-xs font-medium tracking-wider text-marca-cinza-500 uppercase">
              {sessao.admin ? t("admin") : t("areaCliente")}
            </p>
            <p className="truncate text-sm font-semibold text-marca-preto">{sessao.nome}</p>
          </div>
          {conteudo}
        </div>
      )}
    </div>
  );
}
