import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState } from "react-native";
import { textos } from "@/constants/textos";
import { mensagemErroLogin, PERFIL_ERRO, PERFIL_VISITANTE, resolverPerfil } from "./perfil";
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
  /** "erro" = logado, mas papel/cadastro não confirmados (mostre o aviso com "Tentar de novo") */
  papel: Papel;
  /** lojista com cadastro ativo (is_lojista_ativo). Falso para visitante/admin/erro. */
  lojistaAtivo: boolean;
  /** true enquanto a sessão salva é lida ou o papel do usuário ainda está sendo descoberto */
  carregando: boolean;
  /** true quando uma sessão de admin restaurada foi desconectada (mostrar "Use o painel no site") */
  avisoAdmin: boolean;
  limparAvisoAdmin: () => void;
  entrar: (email: string, senha: string) => Promise<ResultadoEntrar>;
  sair: () => Promise<void>;
  /** relê papel/cadastro ativo; se estava em erro, volta a "carregando" enquanto tenta */
  recarregarPerfil: () => void;
};

const SessaoContexto = createContext<ValorSessao | null>(null);

type PerfilResolvido = { usuarioId: string; perfil: Perfil };

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [sessaoLida, setSessaoLida] = useState(false);
  const [resolvido, setResolvido] = useState<PerfilResolvido | null>(null);
  const [versao, setVersao] = useState(0);
  const [avisoAdmin, setAvisoAdmin] = useState(false);
  const sessaoRef = useRef<Session | null>(null);
  // enquanto entrar() roda, ele mesmo resolve o perfil (evita checagem dupla de admin)
  const entrandoRef = useRef(false);
  const emErroRef = useRef(false);

  const usuarioId = sessao?.user.id ?? null;
  const perfilAtual = usuarioId && resolvido?.usuarioId === usuarioId ? resolvido.perfil : null;

  useEffect(() => {
    emErroRef.current = perfilAtual?.papel === "erro";
  }, [perfilAtual]);

  // Tenta de novo (mostrando "carregando") quando o perfil ficou em erro.
  const tentarDeNovo = useCallback(() => {
    setResolvido((atual) => (atual?.perfil.papel === "erro" ? null : atual));
    setVersao((v) => v + 1);
  }, []);

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
    const { data } = supabase.auth.onAuthStateChange((evento, nova) => {
      aplicar(nova);
      // rede voltou (o refresh funcionou): se o perfil estava em erro, tenta de novo
      if (evento === "TOKEN_REFRESHED" && emErroRef.current) tentarDeNovo();
    });
    const assinaturaApp = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && emErroRef.current) tentarDeNovo();
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
      assinaturaApp.remove();
    };
  }, [tentarDeNovo]);

  useEffect(() => {
    if (!usuarioId || entrandoRef.current) return;
    let vivo = true;
    resolverPerfil(supabase, sessaoRef.current)
      .catch((): Perfil => PERFIL_ERRO)
      .then((perfil) => {
        if (!vivo) return;
        setResolvido({ usuarioId, perfil });
        // Sessão de admin restaurada: admin não usa o app; desconecta e avisa.
        if (perfil.papel === "admin") {
          setAvisoAdmin(true);
          void supabase.auth.signOut({ scope: "local" });
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuarioId, versao]);

  const entrar = useCallback(async (email: string, senha: string): Promise<ResultadoEntrar> => {
    const emailLimpo = email.trim();
    if (!emailLimpo || !senha) return { tipo: "erro", mensagem: textos.login.erroCamposVazios };
    entrandoRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      });
      if (error || !data.session) {
        return { tipo: "erro", mensagem: mensagemErroLogin(error ?? { message: "" }) };
      }
      const novoId = data.session.user.id;
      const perfil = await resolverPerfil(supabase, data.session).catch((): Perfil => PERFIL_ERRO);
      if (perfil.papel === "admin") {
        await supabase.auth.signOut({ scope: "local" });
        return { tipo: "admin" };
      }
      // lojista (ou erro, que as abas mostram com "Tentar de novo")
      setResolvido({ usuarioId: novoId, perfil });
      return { tipo: "ok" };
    } catch {
      // sessão pode ter sido criada antes da falha: deixa o efeito resolver o perfil
      setVersao((v) => v + 1);
      return { tipo: "erro", mensagem: textos.geral.semConexao };
    } finally {
      entrandoRef.current = false;
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

  const limparAvisoAdmin = useCallback(() => setAvisoAdmin(false), []);

  const valor = useMemo<ValorSessao>(() => {
    const perfil = perfilAtual ?? PERFIL_VISITANTE;
    return {
      sessao,
      usuarioId,
      email: sessao?.user.email ?? null,
      papel: perfil.papel,
      lojistaAtivo: perfil.lojistaAtivo,
      carregando: !sessaoLida || (usuarioId !== null && perfilAtual === null),
      avisoAdmin,
      limparAvisoAdmin,
      entrar,
      sair,
      recarregarPerfil: tentarDeNovo,
    };
  }, [sessao, usuarioId, perfilAtual, sessaoLida, avisoAdmin, limparAvisoAdmin, entrar, sair, tentarDeNovo]);

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;
}

export function useSessao(): ValorSessao {
  const valor = useContext(SessaoContexto);
  if (!valor) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return valor;
}
