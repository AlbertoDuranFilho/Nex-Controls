import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

const after = vi.fn();
vi.mock("next/server", () => ({ after: (fn: () => unknown) => after(fn) }));

const exigirAdmin = vi.fn();
const createAdminClient = vi.fn();
vi.mock("@/lib/auth/exigir-admin", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

const flags = vi.hoisted(() => ({ nfeAutomatica: true }));
vi.mock("@/lib/flags", () => ({ flags }));

const lerConfigMaino = vi.fn();
const chamarMaino = vi.fn();
const buscarIbgePorCep = vi.fn();
vi.mock("@/lib/maino/config", () => ({ lerConfigMaino: () => lerConfigMaino() }));
vi.mock("@/lib/maino/cliente", () => ({
  chamarMaino: (...a: unknown[]) => chamarMaino(...a),
}));
vi.mock("@/lib/maino/ibge", () => ({ buscarIbgePorCep: (c: string) => buscarIbgePorCep(c) }));

const enviarEmail = vi.fn();
vi.mock("@/lib/email/enviar", () => ({ enviarEmail: (m: unknown) => enviarEmail(m) }));

import { sincronizarSePendente } from "./nfe-sincronizar";
import { cancelarNfeMaino, emitirNfeMaino, enviarPedidoMaino, sincronizarNfeMaino } from "./nfe-admin";

const ID = "11111111-1111-4111-8111-111111111111";
const CFG = { apiUrl: "https://maino.test/api/v2", modalidadeFrete: 9 };

function pedido(extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    numero: 1042,
    status: "pago",
    maino_pedido_id: null,
    nfe_status: null,
    nfe_erro: null,
    maino_nota_url: null,
    cliente_nome: "Loja X",
    cliente_documento: "12345678000195",
    cliente_tipo_pessoa: "PJ",
    cliente_indicador_ie: "contribuinte",
    cliente_inscricao_estadual: "123",
    entrega_cep: "01310100",
    entrega_logradouro: "Av. Paulista",
    entrega_numero: "1000",
    entrega_complemento: null,
    entrega_bairro: "Bela Vista",
    entrega_cidade: "São Paulo",
    entrega_uf: "SP",
    frete_valor: 0,
    observacao: null,
    pedido_itens: [{ produto_codigo: "P1", produto_nome: "Placa", quantidade: 2, preco_unitario: 90 }],
    lojistas: { email: "compras@loja.com", telefone: "(11) 3333-4444" },
    ...extra,
  };
}

// Cada leitura de `pedidos` consome a próxima da fila (a última se repete).
function bancoFalso(leituras: Record<string, unknown>[], rpc: { data?: unknown; error?: unknown } = {}) {
  const fila = [...leituras];
  const rpcFn = vi.fn(async () => ({ data: false, error: null, ...rpc }));
  const db = {
    from: vi.fn(() => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = () => Promise.resolve({ data: fila.length > 1 ? fila.shift() : fila[0], error: null });
      return b;
    }),
    rpc: rpcFn,
  };
  createAdminClient.mockReturnValue(db);
  return { db, rpc: rpcFn };
}

const argsRpc = (rpc: ReturnType<typeof vi.fn>, i = 0) => (rpc.mock.calls[i] as unknown[])[1] as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  flags.nfeAutomatica = true;
  exigirAdmin.mockResolvedValue(undefined);
  lerConfigMaino.mockReturnValue(CFG);
  buscarIbgePorCep.mockResolvedValue(3550308);
  enviarEmail.mockResolvedValue({ ok: true });
  process.env.NEXT_PUBLIC_SITE_URL = "https://nex.test/";
});

describe("autorização e flag", () => {
  const chamadas: [string, () => Promise<unknown>][] = [
    ["enviarPedidoMaino", () => enviarPedidoMaino(ID)],
    ["emitirNfeMaino", () => emitirNfeMaino(ID)],
    ["sincronizarNfeMaino", () => sincronizarNfeMaino(ID)],
    ["cancelarNfeMaino", () => cancelarNfeMaino(ID)],
  ];

  it.each(chamadas)("%s lança sem tocar no banco nem na Mainô quando não é admin", async (_n, chamar) => {
    exigirAdmin.mockRejectedValue(new Error("Acesso negado."));
    await expect(chamar()).rejects.toThrow("Acesso negado.");
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it.each(chamadas)("%s recusa com a flag desligada", async (_n, chamar) => {
    flags.nfeAutomatica = false;
    expect(await chamar()).toEqual({ ok: false, erro: "Emissão automática de NF-e desligada." });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it.each(chamadas)("%s sem credenciais devolve erro claro", async (_n, chamar) => {
    lerConfigMaino.mockReturnValue(null);
    expect(await chamar()).toEqual({ ok: false, erro: "Credenciais da Mainô não configuradas." });
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it("recusa id inválido", async () => {
    expect(await enviarPedidoMaino("nao-uuid")).toEqual({ ok: false, erro: "Pedido não encontrado." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe("enviarPedidoMaino", () => {
  it("cria o pedido na Mainô (transmite=0) e grava o id", async () => {
    const { rpc } = bancoFalso([pedido(), pedido({ maino_pedido_id: "m-9" })]);
    chamarMaino.mockResolvedValue({ ok: true, status: 201, dados: { id: 9 } });
    const r = await enviarPedidoMaino(ID);
    expect(chamarMaino).toHaveBeenCalledTimes(1);
    const [, metodo, caminho, corpo] = chamarMaino.mock.calls[0];
    expect(metodo).toBe("POST");
    expect(caminho).toBe("/pedidos?transmite=0");
    expect((corpo as { numero: string }).numero).toBe("SITE-1042");
    expect(argsRpc(rpc)).toMatchObject({ p_pedido_id: ID, p_maino_pedido_id: "9", p_erro: null });
    expect(r.ok && r.dados.maino_pedido_id).toBe("m-9");
  });

  it("aceita o id em pedido.id", async () => {
    const { rpc } = bancoFalso([pedido()]);
    chamarMaino.mockResolvedValue({ ok: true, status: 201, dados: { pedido: { id: "abc" } } });
    await enviarPedidoMaino(ID);
    expect(argsRpc(rpc).p_maino_pedido_id).toBe("abc");
  });

  it("segunda vez (já enviado) não chama a Mainô", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9" })]);
    const r = await enviarPedidoMaino(ID);
    expect(chamarMaino).not.toHaveBeenCalled();
    expect(r.ok && r.dados.maino_pedido_id).toBe("m-9");
  });

  it("pedido cancelado é recusado", async () => {
    bancoFalso([pedido({ status: "cancelado" })]);
    const r = await enviarPedidoMaino(ID);
    expect(r.ok).toBe(false);
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it("422 da Mainô vira nfe_erro e erro ao admin", async () => {
    const { rpc } = bancoFalso([pedido()]);
    chamarMaino.mockResolvedValue({ ok: false, status: 422, erro: "cliente: inválido" });
    const r = await enviarPedidoMaino(ID);
    expect(r).toEqual({ ok: false, erro: "cliente: inválido" });
    expect(argsRpc(rpc)).toMatchObject({ p_pedido_id: ID, p_erro: "cliente: inválido" });
    expect(argsRpc(rpc).p_maino_pedido_id).toBeUndefined();
  });

  it("resposta sem id grava erro e não marca como enviado", async () => {
    const { rpc } = bancoFalso([pedido()]);
    chamarMaino.mockResolvedValue({ ok: true, status: 201, dados: {} });
    const r = await enviarPedidoMaino(ID);
    expect(r.ok).toBe(false);
    expect(argsRpc(rpc).p_maino_pedido_id).toBeUndefined();
    expect(argsRpc(rpc).p_erro).toBeTruthy();
  });

  it("envia mesmo sem IBGE (ViaCEP falhou)", async () => {
    bancoFalso([pedido()]);
    buscarIbgePorCep.mockResolvedValue(null);
    chamarMaino.mockResolvedValue({ ok: true, status: 201, dados: { id: 1 } });
    await enviarPedidoMaino(ID);
    expect(chamarMaino).toHaveBeenCalledTimes(1);
  });
});

describe("emitirNfeMaino", () => {
  it("exige maino_pedido_id", async () => {
    bancoFalso([pedido()]);
    const r = await emitirNfeMaino(ID);
    expect(r.ok).toBe(false);
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it("exige pedido pago", async () => {
    bancoFalso([pedido({ status: "cancelado", maino_pedido_id: "m-9" })]);
    expect((await emitirNfeMaino(ID)).ok).toBe(false);
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it.each(["NAO_TRANSMITIDA", "EM_TRANSMISSAO", "ACEITA", "CANCELADA", "DENEGADA"])(
    "recusa emitir com nfe_status %s, sem chamar a Mainô",
    async (nfe_status) => {
      bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status })]);
      const r = await emitirNfeMaino(ID);
      expect(r.ok).toBe(false);
      expect(chamarMaino).not.toHaveBeenCalled();
    },
  );

  it("permite reemitir após REJEITADA", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "REJEITADA" })]);
    chamarMaino.mockResolvedValue({ ok: false, status: 422, erro: "x" });
    await emitirNfeMaino(ID);
    expect(chamarMaino.mock.calls[0].slice(1, 3)).toEqual(["POST", "/pedidos/m-9/nota_fiscal"]);
  });

  it("emite e sincroniza", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9" })]);
    chamarMaino
      .mockResolvedValueOnce({ ok: true, status: 200, dados: {} })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        dados: { nota_fiscal: { id: 1, chave_acesso: "K", status: "EM_TRANSMISSAO", danfe_url: null } },
      });
    const r = await emitirNfeMaino(ID);
    expect(r.ok).toBe(true);
    expect(chamarMaino.mock.calls[0].slice(1, 3)).toEqual(["POST", "/pedidos/m-9/nota_fiscal"]);
    expect(chamarMaino.mock.calls[1].slice(1, 3)).toEqual(["GET", "/pedidos/m-9/nota_fiscal"]);
    expect(argsRpc(rpc)).toMatchObject({ p_nfe_status: "EM_TRANSMISSAO", p_chave: "K" });
  });

  it("erro 422 na emissão vira nfe_erro", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9" })]);
    chamarMaino.mockResolvedValue({ ok: false, status: 422, erro: "NCM ausente" });
    const r = await emitirNfeMaino(ID);
    expect(r).toEqual({ ok: false, erro: "NCM ausente" });
    expect(argsRpc(rpc).p_erro).toBe("NCM ausente");
    expect(chamarMaino).toHaveBeenCalledTimes(1);
  });
});

describe("sincronizarNfeMaino", () => {
  const aceita = {
    ok: true,
    status: 200,
    dados: { nota_fiscal: { id: 1, chave_acesso: "K", status: "ACEITA", danfe_url: "https://d.test/x.pdf" } },
  };

  it("true do banco dispara um e-mail ao cliente via after()", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9" })], { data: true });
    chamarMaino.mockResolvedValue(aceita);
    const r = await sincronizarNfeMaino(ID);
    expect(r.ok).toBe(true);
    expect(argsRpc(rpc)).toMatchObject({
      p_nfe_status: "ACEITA",
      p_chave: "K",
      p_danfe_url: "https://d.test/x.pdf",
      p_erro: null,
    });
    expect(after).toHaveBeenCalledTimes(1);
    await after.mock.calls[0][0]();
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    const m = enviarEmail.mock.calls[0][0] as { para: string; assunto: string; texto: string };
    expect(m.para).toBe("compras@loja.com");
    expect(m.assunto).toBe("Nota fiscal do pedido #1042");
    expect(m.texto).toContain("https://d.test/x.pdf");
    expect(m.texto).toContain("https://nex.test/pt/cliente/pedidos/1042");
  });

  it("false do banco (já faturado) não envia e-mail", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9" })], { data: false });
    chamarMaino.mockResolvedValue(aceita);
    await sincronizarNfeMaino(ID);
    expect(after).not.toHaveBeenCalled();
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("falha no envio do e-mail não derruba a ação", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9" })], { data: true });
    chamarMaino.mockResolvedValue(aceita);
    enviarEmail.mockRejectedValue(new Error("boom"));
    const r = await sincronizarNfeMaino(ID);
    expect(r.ok).toBe(true);
    await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
  });

  it("erro da Mainô é gravado em nfe_erro", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9" })]);
    chamarMaino.mockResolvedValue({ ok: false, status: 404, erro: "Pedido não encontrado" });
    const r = await sincronizarNfeMaino(ID);
    expect(r.ok).toBe(false);
    expect(argsRpc(rpc).p_erro).toBe("Pedido não encontrado");
  });

  it("status desconhecido da Mainô não é gravado como status", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9" })]);
    chamarMaino.mockResolvedValue({ ok: true, status: 200, dados: { nota_fiscal: { status: "XYZ" } } });
    const r = await sincronizarNfeMaino(ID);
    expect(r.ok).toBe(false);
    expect(argsRpc(rpc).p_nfe_status).toBeUndefined();
  });
});

describe("cancelarNfeMaino", () => {
  it("exige NF-e ACEITA", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "EM_TRANSMISSAO" })]);
    expect((await cancelarNfeMaino(ID)).ok).toBe(false);
    expect(chamarMaino).not.toHaveBeenCalled();
  });

  it("204 grava CANCELADA", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "ACEITA" })]);
    chamarMaino.mockResolvedValue({ ok: true, status: 204, dados: null });
    const r = await cancelarNfeMaino(ID);
    expect(r.ok).toBe(true);
    expect(chamarMaino.mock.calls[0].slice(1, 3)).toEqual(["DELETE", "/pedidos/m-9/nota_fiscal"]);
    expect(argsRpc(rpc)).toMatchObject({ p_nfe_status: "CANCELADA", p_erro: null });
  });

  it("erro da Mainô é gravado e nada vira CANCELADA", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "ACEITA" })]);
    chamarMaino.mockResolvedValue({ ok: false, status: 422, erro: "Prazo expirado" });
    const r = await cancelarNfeMaino(ID);
    expect(r).toEqual({ ok: false, erro: "Prazo expirado" });
    expect(argsRpc(rpc).p_nfe_status).toBeUndefined();
    expect(argsRpc(rpc).p_erro).toBe("Prazo expirado");
  });
});

describe("sincronizarSePendente (núcleo usado pela página)", () => {
  it("sincroniza sem chamar revalidatePath e sem lançar", async () => {
    const { rpc } = bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "EM_TRANSMISSAO" })]);
    chamarMaino.mockResolvedValue({
      ok: true,
      status: 200,
      dados: { nota_fiscal: { chave_acesso: "K", status: "ACEITA", danfe_url: "https://d.test/x.pdf" } },
    });
    await sincronizarSePendente(ID);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("não faz nada com nota já resolvida ou erro da Mainô", async () => {
    bancoFalso([pedido({ maino_pedido_id: "m-9", nfe_status: "ACEITA" })]);
    await sincronizarSePendente(ID);
    expect(chamarMaino).not.toHaveBeenCalled();
    createAdminClient.mockImplementation(() => {
      throw new Error("banco fora");
    });
    await expect(sincronizarSePendente(ID)).resolves.toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
