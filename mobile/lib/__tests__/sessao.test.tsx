import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppState, Text } from "react-native";

type Ouvinte = (evento: string, sessao: unknown) => void;

// Cliente Supabase falso: sessão em memória, profiles.is_admin, rpc is_lojista_ativo e carrinho.
const mockBanco = {
  sessao: null as null | { user: { id: string; email: string; app_metadata: Record<string, unknown> } },
  ouvintes: [] as Ouvinte[],
  isAdmin: false,
  ativo: true,
  itens: [] as { quantidade: number }[],
  profilesErro: false,
  rpcErro: false,
  chamadasPerfil: 0,
  respostaLogin: null as null | { data: { session: unknown }; error: unknown },
  signOut: jest.fn(),
};

const mockOuvintesApp: ((estado: string) => void)[] = [];

function mockNotificar(evento: string) {
  mockBanco.ouvintes.forEach((o) => o(evento, mockBanco.sessao));
}

jest.mock("@/lib/supabase", () => {
  const consulta = (resultado: () => unknown) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.maybeSingle = async () => resultado();
    q.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
      Promise.resolve(resultado()).then(ok, falha);
    return q;
  };
  return {
    SITE_URL: "https://exemplo.test",
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: mockBanco.sessao }, error: null }),
        onAuthStateChange: (cb: Ouvinte) => {
          mockBanco.ouvintes.push(cb);
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  mockBanco.ouvintes = mockBanco.ouvintes.filter((o) => o !== cb);
                },
              },
            },
          };
        },
        signInWithPassword: async () => {
          const r = mockBanco.respostaLogin!;
          if (r.data.session) {
            mockBanco.sessao = r.data.session as typeof mockBanco.sessao;
            mockNotificar("SIGNED_IN");
          }
          return r;
        },
        signOut: async (...args: unknown[]) => {
          mockBanco.signOut(...args);
          mockBanco.sessao = null;
          mockNotificar("SIGNED_OUT");
          return { error: null };
        },
      },
      from: (tabela: string) =>
        consulta(() =>
          tabela === "profiles"
            ? (mockBanco.chamadasPerfil++,
              mockBanco.profilesErro
                ? { data: null, error: { message: "Network request failed" } }
                : { data: { is_admin: mockBanco.isAdmin }, error: null })
            : { data: mockBanco.itens, error: null },
        ),
      rpc: async (nome: string) => {
        if (nome === "is_lojista_ativo") mockBanco.chamadasPerfil++;
        return nome === "is_lojista_ativo" && !mockBanco.rpcErro
          ? { data: mockBanco.ativo, error: null }
          : { data: null, error: { message: "Network request failed" } };
      },
    },
  };
});

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }) }));

import { ExigeLogin } from "@/components/ExigeLogin";
import { ContagemCarrinhoProvider, textoContador, useContagemCarrinho } from "../contagem-carrinho";
import { SessaoProvider, useSessao } from "../sessao";
import type { ResultadoEntrar } from "../sessao";

function usuario(papel: string) {
  return { user: { id: "u1", email: "cliente@ex.com", app_metadata: { papel } } };
}

let ultimoResultado: ResultadoEntrar | null = null;

function Sonda() {
  const s = useSessao();
  const { contagem } = useContagemCarrinho();
  return (
    <>
      <Text testID="estado">
        {JSON.stringify({
          papel: s.papel,
          ativo: s.lojistaAtivo,
          carregando: s.carregando,
          usuarioId: s.usuarioId,
          contagem,
          avisoAdmin: s.avisoAdmin,
        })}
      </Text>
      <Text
        testID="entrar"
        onPress={async () => {
          ultimoResultado = await s.entrar("cliente@ex.com", "senha");
        }}
      >
        entrar
      </Text>
      <Text testID="sair" onPress={() => void s.sair()}>
        sair
      </Text>
    </>
  );
}

function montar(filho = <Sonda />) {
  return render(
    <SessaoProvider>
      <ContagemCarrinhoProvider>{filho}</ContagemCarrinhoProvider>
    </SessaoProvider>,
  );
}

function estado() {
  return JSON.parse(String(screen.getByTestId("estado").props.children));
}

beforeEach(() => {
  mockBanco.sessao = null;
  mockBanco.ouvintes = [];
  mockBanco.isAdmin = false;
  mockBanco.ativo = true;
  mockBanco.itens = [];
  mockBanco.respostaLogin = null;
  mockBanco.profilesErro = false;
  mockBanco.rpcErro = false;
  mockBanco.chamadasPerfil = 0;
  mockBanco.signOut.mockClear();
  mockOuvintesApp.length = 0;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_tipo, cb) => {
    const ouvinte = cb as (estado: string) => void;
    mockOuvintesApp.push(ouvinte);
    return { remove: () => void mockOuvintesApp.splice(mockOuvintesApp.indexOf(ouvinte), 1) };
  });
  ultimoResultado = null;
});

describe("SessaoProvider", () => {
  it("sem sessão: visitante, sem carrinho", async () => {
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    expect(estado()).toEqual({
      papel: "visitante",
      ativo: false,
      carregando: false,
      usuarioId: null,
      contagem: 0,
      avisoAdmin: false,
    });
  });

  it("lojista ativo: papel lojista, ativo e contagem = soma das quantidades", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.itens = [{ quantidade: 2 }, { quantidade: 3 }];
    await montar();
    await waitFor(() => expect(estado().contagem).toBe(5));
    expect(estado()).toMatchObject({ papel: "lojista", ativo: true, carregando: false, usuarioId: "u1" });
  });

  it("lojista inativo: papel lojista, não ativo, sem contador", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.ativo = false;
    mockBanco.itens = [{ quantidade: 4 }];
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    expect(estado()).toMatchObject({ papel: "lojista", ativo: false, contagem: 0 });
  });

  it("admin de verdade (metadata + profiles.is_admin) é desconectado e vira visitante", async () => {
    mockBanco.sessao = usuario("admin");
    mockBanco.isAdmin = true;
    await montar();
    await waitFor(() => expect(mockBanco.signOut).toHaveBeenCalledWith({ scope: "local" }));
    await waitFor(() => expect(estado()).toMatchObject({ papel: "visitante", usuarioId: null, avisoAdmin: true }));
  });

  it("metadata admin sem profiles.is_admin não é admin (como no site)", async () => {
    mockBanco.sessao = usuario("admin");
    mockBanco.isAdmin = false;
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    expect(estado()).toMatchObject({ papel: "lojista", ativo: true });
    expect(mockBanco.signOut).not.toHaveBeenCalled();
  });

  it("entrar com conta admin devolve 'admin' e desconecta", async () => {
    mockBanco.isAdmin = true;
    mockBanco.respostaLogin = { data: { session: usuario("admin") }, error: null };
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    await act(async () => {
      await fireEvent.press(screen.getByTestId("entrar"));
    });
    await waitFor(() => expect(ultimoResultado).toEqual({ tipo: "admin" }));
    expect(mockBanco.signOut).toHaveBeenCalledTimes(1);
    // só entrar() checou o perfil (sem checagem dupla) e o aviso fica na tela de login
    expect(mockBanco.chamadasPerfil).toBe(1);
    await waitFor(() => expect(estado()).toMatchObject({ papel: "visitante", avisoAdmin: false }));
  });

  it("entrar com senha errada devolve a mensagem amigável", async () => {
    mockBanco.respostaLogin = {
      data: { session: null },
      error: { message: "Invalid login credentials", status: 400, code: "invalid_credentials" },
    };
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    await act(async () => {
      await fireEvent.press(screen.getByTestId("entrar"));
    });
    await waitFor(() => expect(ultimoResultado).toEqual({ tipo: "erro", mensagem: "E-mail ou senha inválidos." }));
  });

  it("entrar como lojista e depois sair volta a visitante", async () => {
    mockBanco.respostaLogin = { data: { session: usuario("lojista") }, error: null };
    await montar();
    await waitFor(() => expect(estado().carregando).toBe(false));
    await act(async () => {
      await fireEvent.press(screen.getByTestId("entrar"));
    });
    await waitFor(() => expect(ultimoResultado).toEqual({ tipo: "ok" }));
    await waitFor(() => expect(estado()).toMatchObject({ papel: "lojista", ativo: true }));
    await act(async () => {
      await fireEvent.press(screen.getByTestId("sair"));
    });
    await waitFor(() => expect(estado()).toMatchObject({ papel: "visitante", usuarioId: null, contagem: 0 }));
  });

  it("sessão que expira (SIGNED_OUT do refresh) volta a visitante sem travar", async () => {
    mockBanco.sessao = usuario("lojista");
    await montar();
    await waitFor(() => expect(estado().papel).toBe("lojista"));
    await act(async () => {
      mockBanco.sessao = null;
      mockNotificar("SIGNED_OUT");
    });
    await waitFor(() => expect(estado()).toMatchObject({ papel: "visitante", carregando: false }));
  });
});

describe("erros ao descobrir o perfil", () => {
  it("erro no is_lojista_ativo vira 'erro' (não inativo) e tenta de novo ao voltar para o app", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.rpcErro = true;
    await montar();
    await waitFor(() => expect(estado()).toMatchObject({ papel: "erro", ativo: false, carregando: false }));
    mockBanco.rpcErro = false;
    await act(async () => {
      mockOuvintesApp.forEach((cb) => cb("active"));
    });
    await waitFor(() => expect(estado()).toMatchObject({ papel: "lojista", ativo: true }));
  });

  it("perfil em erro tenta de novo quando o token é renovado", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.rpcErro = true;
    await montar();
    await waitFor(() => expect(estado().papel).toBe("erro"));
    mockBanco.rpcErro = false;
    await act(async () => {
      mockNotificar("TOKEN_REFRESHED");
    });
    await waitFor(() => expect(estado()).toMatchObject({ papel: "lojista", ativo: true }));
  });

  it("metadata admin + erro ao ler profiles: trata como admin e desconecta (nunca vira lojista)", async () => {
    mockBanco.sessao = usuario("admin");
    mockBanco.profilesErro = true;
    await montar();
    await waitFor(() => expect(mockBanco.signOut).toHaveBeenCalledWith({ scope: "local" }));
    await waitFor(() => expect(estado()).toMatchObject({ papel: "visitante", usuarioId: null, avisoAdmin: true }));
  });

  it("ExigeLogin mostra 'Não foi possível carregar seus dados' e 'Tentar de novo' resolve", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.rpcErro = true;
    await montar(
      <ExigeLogin exigirAtivo>
        <Text>carrinho</Text>
      </ExigeLogin>,
    );
    expect(await screen.findByText("Não foi possível carregar seus dados")).toBeTruthy();
    expect(screen.queryByText("Cadastro inativo")).toBeNull();
    mockBanco.rpcErro = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("carrinho")).toBeTruthy();
  });
});

describe("contador do carrinho", () => {
  it("relê ao voltar para o app", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.itens = [{ quantidade: 1 }];
    await montar();
    await waitFor(() => expect(estado().contagem).toBe(1));
    mockBanco.itens = [{ quantidade: 1 }, { quantidade: 4 }];
    await act(async () => {
      mockOuvintesApp.forEach((cb) => cb("active"));
    });
    await waitFor(() => expect(estado().contagem).toBe(5));
  });
});

describe("ExigeLogin", () => {
  it("visitante vê 'Entre para continuar' com botão de entrar", async () => {
    await montar(
      <ExigeLogin>
        <Text>conteúdo</Text>
      </ExigeLogin>,
    );
    expect(await screen.findByText("Entre para continuar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(screen.queryByText("conteúdo")).toBeNull();
  });

  it("lojista vê o conteúdo; inativo com exigirAtivo vê o aviso", async () => {
    mockBanco.sessao = usuario("lojista");
    mockBanco.ativo = false;
    await montar(
      <>
        <ExigeLogin>
          <Text>pedidos</Text>
        </ExigeLogin>
        <ExigeLogin exigirAtivo>
          <Text>carrinho</Text>
        </ExigeLogin>
      </>,
    );
    expect(await screen.findByText("pedidos")).toBeTruthy();
    expect(screen.getByText("Cadastro inativo")).toBeTruthy();
    expect(screen.queryByText("carrinho")).toBeNull();
  });
});

describe("textoContador", () => {
  it("esconde zero e limita em 99+", () => {
    expect(textoContador(0)).toBeUndefined();
    expect(textoContador(7)).toBe("7");
    expect(textoContador(150)).toBe("99+");
  });
});
