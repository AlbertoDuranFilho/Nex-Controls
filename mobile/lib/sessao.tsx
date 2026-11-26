import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { textos } from "@/constants/textos";
import { mensagemErroLogin, PERFIL_VISITANTE, resolverPerfil } from "./perfil";
import type { Papel, Perfil } from "./perfil";
import { supabase } from "./supabase";

export type { Papel } from "./perfil";

export type ResultadoEntrar =
  | { tipo: "ok" }
  /** conta de admin: o app desconecta e a tela mostra "Use o painel no site" */
  | { tipo: "admin" }
  | { tipo: "erro"; mensagem: string };

export type ValorSessao = {
  sessao: Session | null;
  usuarioId: string | null;
  email: string | null;
  papel: Papel;
  /** lojista com cadastro ativo (is_lojista_ativo). Falso para visitante/admin. */
  lojistaAtivo: boolean;
  /** true enquanto a sessão salva é lida ou o papel do usuário ainda está sendo descoberto */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<ResultadoEntrar>;
  sair: () => Promise<void>;
  /** relê papel/cadastro ativo (ex.: puxar para atualizar na Conta) */
  recarregarPerfil: () => void;
};

const SessaoContexto = createContext<ValorSessao | null>(null);

type PerfilResolvido = { usuarioId: string; perfil: Perfil };

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [sessaoLida, setSessaoLida] = useState(false);
  const [resolvido, setResolvido] = useState<PerfilResolvido | null>(null);
  const [versao, setVersao] = useState(0);
  const sessaoRef = useRef<Session | null>(null);

  const usuarioId = sessao?.user.id ?? null;

  useEffect(() => {
    let vivo = true;
    const aplicar = (nova: Session | null) => {
      if (!vivo) return;
      sessaoRef.current = nova;
      setSessao(nova);
      setSessaoLida(true);
    };
    // Sessão salva: o supabase-js renova o token se expirou; se não der, volta null.
    supabase.auth
      .getSession()
      .then(({ data }) => aplicar(data.session))
      .catch(() => aplicar(null));
    // Callback síncrono: nada de await de chamadas do Supabase aqui (trava o cliente).
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => aplicar(nova));
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    resolverPerfil(supabase, sessaoRef.current)
      .catch((): Perfil => ({ papel: "lojista", lojistaAtivo: false }))
      .then((perfil) => {
        if (!vivo) return;
        setResolvido({ usuarioId, perfil });
        // Admin não usa o app: desconecta (a tela de login mostra o aviso).
        if (perfil.papel === "admin") void supabase.auth.signOut({ scope: "local" });
      });
    return () => {
      vivo = false;
    };
  }, [usuarioId, versao]);

  const entrar = useCallback(async (email: string, senha: string): Promise<ResultadoEntrar> => {
    const emailLimpo = email.trim();
    if (!emailLimpo || !senha) return { tipo: "erro", mensagem: textos.login.erroCamposVazios };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      });
      if (error || !data.session) {
        return { tipo: "erro", mensagem: mensagemErroLogin(error ?? { message: "" }) };
      }
      const perfil = await resolverPerfil(supabase, data.session);
      if (perfil.papel === "admin") {
        await supabase.auth.signOut({ scope: "local" });
        return { tipo: "admin" };
      }
      return { tipo: "ok" };
    } catch {
      return { tipo: "erro", mensagem: textos.geral.semConexao };
    }
  }, []);

  const sair = useCallback(async () => {
    // "local": sai só deste aparelho; o site continua logado.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // sem rede: o supabase-js já limpou a sessão local
    }
    sessaoRef.current = null;
    setSessao(null);
  }, []);

  const recarregarPerfil = useCallback(() => setVersao((v) => v + 1), []);

  const valor = useMemo<ValorSessao>(() => {
    const perfilAtual =
      usuarioId && resolvido?.usuarioId === usuarioId ? resolvido.perfil : null;
    const perfil = perfilAtual ?? PERFIL_VISITANTE;
    return {
      sessao,
      usuarioId,
      email: sessao?.user.email ?? null,
      papel: perfil.papel,
      lojistaAtivo: perfil.lojistaAtivo,
      carregando: !sessaoLida || (usuarioId !== null && perfilAtual === null),
      entrar,
      sair,
      recarregarPerfil,
    };
  }, [sessao, usuarioId, resolvido, sessaoLida, entrar, sair, recarregarPerfil]);

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;
}

export function useSessao(): ValorSessao {
  const valor = useContext(SessaoContexto);
  if (!valor) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return valor;
}
