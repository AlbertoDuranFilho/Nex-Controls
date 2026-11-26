"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  TicketPercent,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import LogoNex from "@/components/ui/LogoNex";
import Selo from "@/components/ui/Selo";
import { itemAdminAtivo } from "@/lib/admin/rota";
import { sair } from "@/services/auth";

type Item = { href: string; rotulo: string; icone: LucideIcon; raiz?: boolean; contagem?: number };

const baseItem =
  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-branco motion-reduce:transition-none";
const itemInativo = `${baseItem} font-medium text-marca-cinza-300 hover:bg-marca-branco/10 hover:text-marca-branco`;
const itemAtivo = `${baseItem} bg-marca-branco font-semibold text-marca-preto shadow-suave`;

const botaoIcone =
  "grid size-11 shrink-0 place-items-center rounded-xl text-marca-branco transition-colors duration-150 hover:bg-marca-branco/10 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-branco motion-reduce:transition-none";

// Conteúdo do menu (mesmo na lateral fixa e na gaveta do celular).
function ConteudoMenu({
  locale,
  itens,
  pathname,
  onNavegar,
}: {
  locale: string;
  itens: Item[];
  pathname: string;
  onNavegar?: () => void;
}) {
  const idBase = useId();
  return (
    <>
      <nav aria-label="Administração" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {itens.map(({ href, rotulo, icone: Icone, raiz, contagem }) => {
            const ativo = itemAdminAtivo(pathname, href, !!raiz);
            const idContagem = contagem ? `${idBase}-contagem` : undefined;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  aria-describedby={idContagem}
                  onClick={onNavegar}
                  className={ativo ? itemAtivo : itemInativo}
                >
                  <Icone
                    aria-hidden
                    className={`size-[18px] shrink-0 ${ativo ? "" : "text-marca-cinza-400 group-hover:text-marca-branco"}`}
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate">{rotulo}</span>
                  {contagem ? (
                    <Selo tom={ativo ? "escuro" : "neutro"} aria-hidden="true" className="tabular-nums">
                      {contagem}
                    </Selo>
                  ) : null}
                </Link>
                {/* Fora do link: o nome continua "Pedidos"; a contagem vai como descrição. */}
                {contagem ? (
                  <span id={idContagem} className="sr-only">
                    {contagem} aguardando pagamento
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-1 border-t border-marca-branco/10 px-3 py-4">
        <Link href={`/${locale}`} onClick={onNavegar} className={itemInativo}>
          <ExternalLink aria-hidden className="size-[18px] shrink-0 text-marca-cinza-400 group-hover:text-marca-branco" strokeWidth={1.75} />
          Ver site
        </Link>
        <form action={() => sair(locale)}>
          <button type="submit" className={itemInativo}>
            <LogOut aria-hidden className="size-[18px] shrink-0 text-marca-cinza-400 group-hover:text-marca-branco" strokeWidth={1.75} />
            Sair
          </button>
        </form>
      </div>
    </>
  );
}

function Marca({ locale }: { locale: string }) {
  return (
    <Link
      href={`/${locale}/admin`}
      className="flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-marca-branco focus-visible:outline-none"
    >
      <LogoNex clara className="w-24" />
      <span className="rounded-full border border-marca-branco/20 px-2 py-0.5 text-[11px] font-medium tracking-wider text-marca-cinza-300 uppercase">
        Admin
      </span>
    </Link>
  );
}

// Barra lateral preta fixa a partir de lg; abaixo disso, barra no topo com botão que abre a gaveta.
export default function MenuAdmin({ locale, aguardando }: { locale: string; aguardando: number }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const botaoAbrir = useRef<HTMLButtonElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  const base = `/${locale}/admin`;
  const itens: Item[] = [
    { href: base, rotulo: "Início", icone: LayoutDashboard, raiz: true },
    { href: `${base}/lojistas`, rotulo: "Clientes", icone: Users },
    { href: `${base}/produtos`, rotulo: "Produtos", icone: Package },
    { href: `${base}/cupons`, rotulo: "Cupons", icone: TicketPercent },
    { href: `${base}/pedidos`, rotulo: "Pedidos", icone: Receipt, contagem: aguardando > 0 ? aguardando : undefined },
  ];

  // Fecha a gaveta ao trocar de rota (inclui o redirect do Sair).
  useEffect(() => setAberto(false), [pathname]);

  // Gaveta aberta: foco no fechar, Esc fecha e a página de trás não rola.
  useEffect(() => {
    if (!aberto) return;
    botaoFechar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [aberto]);

  // Qualquer fechamento (link, rota, fundo, Esc, X) devolve o foco ao botão "Abrir menu".
  const estavaAberto = useRef(false);
  useEffect(() => {
    if (estavaAberto.current && !aberto) botaoAbrir.current?.focus();
    estavaAberto.current = aberto;
  }, [aberto]);

  // Ao crescer a janela até lg, a lateral fixa assume: fecha a gaveta.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const aoMudar = (e: MediaQueryListEvent) => {
      if (e.matches) setAberto(false);
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-marca-preto lg:flex">
        <div className="px-6 pt-7 pb-4">
          <Marca locale={locale} />
        </div>
        <ConteudoMenu locale={locale} itens={itens} pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-marca-preto px-4 lg:hidden">
        <Marca locale={locale} />
        <button
          ref={botaoAbrir}
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className={botaoIcone}
        >
          <Menu aria-hidden className="size-6" strokeWidth={1.75} />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-marca-preto/50" onClick={() => setAberto(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu da administração"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-marca-preto shadow-elevada"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <Marca locale={locale} />
              <button ref={botaoFechar} type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className={botaoIcone}>
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ConteudoMenu locale={locale} itens={itens} pathname={pathname} onNavegar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
