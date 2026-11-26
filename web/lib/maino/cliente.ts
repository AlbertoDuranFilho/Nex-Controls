import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfigMaino } from "./config";

const TIMEOUT_MS = 15_000;
const ESPERA_MAX_MS = 5_000;
const ERRO_MAX = 500;
const PROVEDOR = "maino";

export type RespostaMaino<T> =
  | { ok: true; status: number; dados: T }
  | { ok: false; status: number; erro: string };

export type TokenStore = {
  ler(): Promise<string | null>;
  gravar(token: string): Promise<void>;
};

export type Deps = {
  fetch?: typeof fetch;
  tokens?: TokenStore;
  esperar?: (ms: number) => Promise<void>;
  /** Timeout de cada requisição (padrão 15 s). O render da página usa um menor. */
  timeoutMs?: number;
  /** Espera máxima antes de repetir após 429 (padrão 5 s). */
  esperaMaxMs?: number;
};

const TIMEOUT_MSG = "Mainô não respondeu a tempo.";

/** Token em `integracao_tokens` (só service role). */
function tokenStorePadrao(): TokenStore {
  return {
    async ler() {
      const { data } = await createAdminClient()
        .from("integracao_tokens")
        .select("access_token")
        .eq("provedor", PROVEDOR)
        .maybeSingle();
      return data?.access_token ?? null;
    },
    async gravar(token) {
      await createAdminClient()
        .from("integracao_tokens")
        .upsert({ provedor: PROVEDOR, access_token: token, atualizado_em: new Date().toISOString() });
    },
  };
}

function achatar(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(achatar).filter(Boolean).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${achatar(val)}`)
      .join("; ");
  }
  return "";
}

function textoErro(corpo: unknown, status: number): string {
  let texto = "";
  if (corpo && typeof corpo === "object") {
    const c = corpo as { error?: unknown; errors?: unknown };
    texto = achatar(c.error) || achatar(c.errors);
  }
  if (!texto) texto = `Erro ${status} da Mainô.`;
  return texto.slice(0, ERRO_MAX);
}

function ehTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

async function lerJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Chamada crua com timeout; nunca lança. */
async function requisitar(
  f: typeof fetch,
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
  timeoutMs: number = TIMEOUT_MS,
): Promise<{ res: Response } | { erro: RespostaMaino<never> & { ok: false } }> {
  try {
    const res = await f(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return { res };
  } catch (e) {
    return {
      erro: {
        ok: false,
        status: 0,
        erro: ehTimeout(e) ? TIMEOUT_MSG : "Não foi possível conectar à Mainô.",
      },
    };
  }
}

/** Login: devolve o token ou um erro sem expor corpo/credenciais. */
async function entrar(
  cfg: ConfigMaino,
  f: typeof fetch,
  timeoutMs: number,
): Promise<{ token: string } | { erro: RespostaMaino<never> & { ok: false } }> {
  const r = await requisitar(f, `${cfg.apiUrl}/authentication`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      application_uid: cfg.applicationUid,
      email: cfg.email,
      password: cfg.senha,
    }),
  }, timeoutMs);
  if ("erro" in r) return r;
  const corpo = await lerJson(r.res);
  if (!r.res.ok) {
    return {
      erro: {
        ok: false,
        status: r.res.status,
        erro: `Falha na autenticação com a Mainô: ${textoErro(corpo, r.res.status)}`.slice(0, ERRO_MAX),
      },
    };
  }
  const c = (corpo ?? {}) as Record<string, unknown>;
  const token = [c.access_token, c.token, c.auth_token].find(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  if (!token) {
    return {
      erro: { ok: false, status: r.res.status, erro: "Mainô não devolveu token de acesso." },
    };
  }
  return { token };
}

export async function chamarMaino<T>(
  cfg: ConfigMaino,
  metodo: "GET" | "POST" | "DELETE",
  caminho: string,
  corpo?: unknown,
  deps: Deps = {},
): Promise<RespostaMaino<T>> {
  const f = deps.fetch ?? fetch;
  const tokens = deps.tokens ?? tokenStorePadrao();
  const esperar = deps.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  const esperaMax = deps.esperaMaxMs ?? ESPERA_MAX_MS;

  async function login(): Promise<{ token: string } | { erro: RespostaMaino<never> & { ok: false } }> {
    const l = await entrar(cfg, f, timeoutMs);
    if ("token" in l) {
      try {
        await tokens.gravar(l.token);
      } catch {
        // cache de token indisponível: segue só com o token em memória
      }
    }
    return l;
  }

  let token: string | null = null;
  try {
    token = await tokens.ler();
  } catch {
    token = null;
  }
  if (!token) {
    const l = await login();
    if ("erro" in l) return l.erro;
    token = l.token;
  }

  const enviar = (t: string) =>
    requisitar(f, `${cfg.apiUrl}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: "application/json",
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    }, timeoutMs);

  let r = await enviar(token);
  if ("erro" in r) return r.erro;

  if (r.res.status === 401) {
    const l = await login();
    if ("erro" in l) return l.erro;
    token = l.token;
    r = await enviar(token);
    if ("erro" in r) return r.erro;
  }

  if (r.res.status === 429) {
    const seg = Number(r.res.headers.get("Retry-After"));
    const ms = Math.min(Number.isFinite(seg) && seg > 0 ? seg * 1000 : 1000, esperaMax);
    await esperar(ms);
    const novo = await enviar(token);
    if ("erro" in novo) return novo.erro;
    r = novo;
  }

  const { res } = r;
  if (res.status === 204) return { ok: true, status: 204, dados: null as T };
  const json = await lerJson(res);
  if (!res.ok) return { ok: false, status: res.status, erro: textoErro(json, res.status) };
  return { ok: true, status: res.status, dados: json as T };
}
