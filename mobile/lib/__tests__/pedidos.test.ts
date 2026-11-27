import {
  CORES_TOM,
  formatarData,
  lerNumeroPedido,
  linkNotaFiscal,
  listarMeusPedidos,
  notificarPedido,
  obterMeuPedido,
  rotuloStatus,
  VISUAL_STATUS,
  visualStatus,
} from "@/lib/pedidos";
import type { PedidoStatus } from "@/lib/pedidos";
import type { criarSupabaseFalso } from "@/test-utils/supabaseFalso";

jest.mock("@/lib/supabase", () => {
  const { criarSupabaseFalso: criar } = jest.requireActual("@/test-utils/supabaseFalso");
  const falso = criar();
  return { SITE_URL: "https://site.test", supabase: falso.cliente, __falso: falso };
});

const falso = jest.requireMock("@/lib/supabase").__falso as ReturnType<typeof criarSupabaseFalso>;
const fetchFalso = jest.fn();
const avisos = jest.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  falso.limpar();
  fetchFalso.mockReset();
  avisos.mockClear();
  globalThis.fetch = fetchFalso as unknown as typeof fetch;
});

const TODOS: PedidoStatus[] = [
  "aguardando_pagamento",
  "pago",
  "faturado",
  "enviado",
  "entregue",
  "cancelado",
  "erro_pagamento",
  "devolvido",
];

describe("status do pedido (mesmos tons do site)", () => {
  it("cada status tem o tom do site", () => {
    expect(Object.fromEntries(TODOS.map((s) => [s, VISUAL_STATUS[s].tom]))).toEqual({
      aguardando_pagamento: "ambar",
      pago: "azul",
      faturado: "violeta",
      enviado: "ciano",
      entregue: "verde",
      cancelado: "vermelho",
      erro_pagamento: "vermelho",
      devolvido: "neutro",
    });
  });

  it("cada status tem ícone, rótulo em português e cores definidas", () => {
    for (const s of TODOS) {
      expect(VISUAL_STATUS[s].icone).toBeTruthy();
      expect(rotuloStatus(s)).not.toBe(s);
      expect(CORES_TOM[VISUAL_STATUS[s].tom].fundo).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(rotuloStatus("erro_pagamento")).toBe("Erro no pagamento");
  });

  it("status desconhecido não quebra: neutro e o próprio valor como rótulo", () => {
    expect(visualStatus("novo_status").tom).toBe("neutro");
    expect(rotuloStatus("novo_status")).toBe("novo_status");
  });
});

describe("nota fiscal", () => {
  it("só mostra link https", () => {
    expect(linkNotaFiscal({ maino_nota_url: "https://d.test/x.pdf", nfe_status: "ACEITA" })).toBe(
      "https://d.test/x.pdf",
    );
    expect(linkNotaFiscal({ maino_nota_url: "http://d.test/x.pdf", nfe_status: "ACEITA" })).toBeNull();
    expect(linkNotaFiscal({ maino_nota_url: "javascript:alert(1)", nfe_status: null })).toBeNull();
    expect(linkNotaFiscal({ maino_nota_url: null, nfe_status: null })).toBeNull();
  });

  it("nota cancelada esconde o link", () => {
    expect(linkNotaFiscal({ maino_nota_url: "https://d.test/x.pdf", nfe_status: "CANCELADA" })).toBeNull();
  });
});

describe("número e data", () => {
  it("aceita só inteiro positivo", () => {
    expect(lerNumeroPedido("1042")).toBe(1042);
    expect(lerNumeroPedido("0")).toBeNull();
    expect(lerNumeroPedido("12a")).toBeNull();
    expect(lerNumeroPedido(["1"])).toBeNull();
    expect(lerNumeroPedido(undefined)).toBeNull();
  });

  it("data no horário de Recife", () => {
    expect(formatarData("2026-11-26T02:30:00Z")).toBe("25/11/2026");
    expect(formatarData("invalida")).toBe("");
  });
});

describe("consultas filtram pelo usuário atual", () => {
  it("lista só pedidos do lojista_id do usuário", async () => {
    falso.respostas.pedidos = { data: [{ numero: "7", created_at: "2026-11-26T12:00:00Z", status: "pago", total: "10.5" }], error: null };
    const lista = await listarMeusPedidos("u1");
    expect(falso.filtros("pedidos")).toContainEqual(["lojista_id", "u1"]);
    expect(lista).toEqual([{ numero: 7, created_at: "2026-11-26T12:00:00Z", status: "pago", total: 10.5 }]);
  });

  it("detalhe filtra por número e lojista_id e monta itens/endereço como o site", async () => {
    falso.respostas.pedidos = {
      data: {
        id: "p1",
        numero: 9,
        created_at: "2026-11-26T12:00:00Z",
        status: "faturado",
        total: "190",
        subtotal: "200",
        desconto_valor: "10",
        desconto_origem: "cupom",
        frete_valor: "0",
        observacao: null,
        maino_nota_url: "https://d.test/n.pdf",
        nfe_status: "ACEITA",
        entrega_logradouro: "Rua A",
        entrega_numero: "10",
        entrega_complemento: "Sala 2",
        entrega_bairro: "Centro",
        entrega_cidade: "Recife",
        entrega_uf: "PE",
        entrega_cep: "50000-000",
        pedido_itens: [
          { produto_codigo: "NX-2", produto_nome: "B", quantidade: 1, preco_unitario: "100" },
          { produto_codigo: "NX-1", produto_nome: "A", quantidade: 3, preco_unitario: "33.333" },
        ],
      },
      error: null,
    };
    falso.respostas.pedido_eventos = { data: [], error: null };
    const p = await obterMeuPedido("u1", 9);
    expect(falso.filtros("pedidos")).toEqual(
      expect.arrayContaining([
        ["numero", 9],
        ["lojista_id", "u1"],
      ]),
    );
    expect(falso.filtros("pedido_eventos")).toContainEqual(["pedido_id", "p1"]);
    expect(p?.itens.map((i) => i.codigo)).toEqual(["NX-1", "NX-2"]);
    expect(p?.itens[0].total_linha).toBe(100);
    expect(p?.entrega).toBe("Rua A, 10, Sala 2 — Centro, Recife/PE — CEP 50000-000");
  });

  it("pedido de outro cliente (sem linha) → null", async () => {
    falso.respostas.pedidos = { data: null, error: null };
    expect(await obterMeuPedido("u1", 5)).toBeNull();
  });
});

describe("notificarPedido (rota do site)", () => {
  it("POST na rota com o Bearer do usuário", async () => {
    fetchFalso.mockResolvedValue({ ok: true, status: 200, json: async () => ({ enviado: true }) });
    expect(await notificarPedido("abc-123")).toBe("enviado");
    expect(fetchFalso).toHaveBeenCalledWith("https://site.test/api/app/pedidos/abc-123/notificar", {
      method: "POST",
      headers: { Authorization: "Bearer token-do-usuario" },
    });
  });

  it("já notificado é sucesso silencioso", async () => {
    fetchFalso.mockResolvedValue({ ok: true, status: 200, json: async () => ({ jaNotificado: true }) });
    expect(await notificarPedido("p")).toBe("ja_notificado");
  });

  it.each([401, 404, 500, 502])("resposta %s só registra no log, sem lançar", async (status) => {
    fetchFalso.mockResolvedValue({ ok: false, status, json: async () => null });
    await expect(notificarPedido("p")).resolves.toBe("falhou");
    expect(avisos).toHaveBeenCalled();
  });

  it("rede caiu: não lança", async () => {
    fetchFalso.mockRejectedValue(new TypeError("Network request failed"));
    await expect(notificarPedido("p")).resolves.toBe("falhou");
  });

  it("sem sessão não chama a rota", async () => {
    falso.getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    expect(await notificarPedido("p")).toBe("falhou");
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
