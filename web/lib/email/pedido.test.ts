import { describe, expect, it } from "vitest";
import { montarEmailCliente, montarEmailNex, type PedidoEmail } from "./pedido";

const pedido: PedidoEmail = {
  numero: 1042,
  data: "2026-11-25T14:30:00.000Z",
  cliente: {
    nome: "<b>X</b>",
    documento: "12345678000195",
    tipo_pessoa: "PJ",
    inscricao_estadual: "123.456.789.110",
    email: "compras@loja.com",
    telefone: "(11) 3333-4444",
    whatsapp: "(11) 99999-0000",
    responsavel: "Maria",
  },
  entrega: {
    cep: "01310100",
    logradouro: "Av. Paulista",
    numero: "1000",
    complemento: "Sala 5",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    uf: "SP",
  },
  itens: [{ codigo: "P1", nome: "Placa <i>", quantidade: 2, preco_unitario: 90, total_linha: 180 }],
  subtotal: 200,
  desconto_valor: 20,
  desconto_origem: "cliente",
  cupom_codigo: null,
  total: 180,
  observacao: "<script>",
};

describe("montarEmailCliente", () => {
  it("assunto com o número do pedido", () => {
    expect(montarEmailCliente(pedido).assunto).toBe("Pedido #1042 recebido — Nex Controls");
  });

  it("escapa nome e observação no HTML", () => {
    const { html } = montarEmailCliente(pedido);
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;i&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>X</b>");
  });

  it("texto tem a mensagem, frete a combinar e o total", () => {
    const { texto, html } = montarEmailCliente(pedido);
    expect(texto).toContain(
      "Recebemos seu pedido. A Nex entrará em contato para combinar frete e pagamento.",
    );
    expect(texto).toContain("Frete: a combinar");
    expect(texto).toMatch(/R\$\s180,00/);
    expect(texto).toMatch(/R\$\s20,00/);
    expect(texto).toContain("<script>");
    expect(html).toContain("Frete: a combinar");
  });

  it("mostra o cupom quando o desconto é de cupom", () => {
    const { texto } = montarEmailCliente({ ...pedido, desconto_origem: "cupom", cupom_codigo: "C30V" });
    expect(texto).toContain("C30V");
  });

  it("sem observação não mostra a linha", () => {
    const { texto } = montarEmailCliente({ ...pedido, observacao: null });
    expect(texto).not.toContain("Observação");
  });
});

describe("montarEmailNex", () => {
  const link = "https://www.nexcontrols.com/pt/admin/pedidos/1042";

  it("assunto com número e cliente", () => {
    expect(montarEmailNex(pedido, link).assunto).toBe("Novo pedido #1042 — <b>X</b>");
  });

  it("contém link do painel, documento formatado, IE, endereço e contatos", () => {
    const { html, texto } = montarEmailNex(pedido, link);
    for (const s of [html, texto]) {
      expect(s).toContain(link);
      expect(s).toContain("12.345.678/0001-95");
      expect(s).toContain("123.456.789.110");
      expect(s).toContain("Av. Paulista");
      expect(s).toContain("(11) 99999-0000");
      expect(s).toContain("(11) 3333-4444");
      expect(s).toContain("compras@loja.com");
      expect(s).toContain("Maria");
    }
    expect(html).toContain(`href="${link}"`);
    expect(html).toContain("&lt;b&gt;X&lt;/b&gt;");
    expect(html).not.toContain("<script>");
  });
});
