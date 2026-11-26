import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { lerPlanilha } from "./ler-planilha";

type Celula = ExcelJS.CellValue;

const CAB_PRODUTOS = ["codigo *", "nome *", "preco (R$)", "ativo", "ncm", "ean", "origem", "unidade", "manual (link ou arquivo)"];
const CAB_ESP = ["codigo do produto *", "nome *", "valor *"];
const CAB_IMG = ["codigo do produto *", "imagem * (link ou arquivo)", "texto alternativo"];

async function montar(abas: {
  produtos?: Celula[][];
  especificacoes?: Celula[][];
  imagens?: Celula[][];
}): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  if (abas.produtos) wb.addWorksheet("Produtos").addRows(abas.produtos);
  if (abas.especificacoes) wb.addWorksheet("Especificacoes").addRows(abas.especificacoes);
  if (abas.imagens) wb.addWorksheet("Imagens").addRows(abas.imagens);
  const buf = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buf as ArrayBuffer);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const prod = (linha: Celula[]) => montar({ produtos: [CAB_PRODUTOS, linha] });

describe("lerPlanilha", () => {
  it("lê o modelo real", async () => {
    const b = readFileSync(join(__dirname, "../../public/modelos/modelo-produtos.xlsx"));
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    const r = await lerPlanilha(ab);
    expect(r.erros).toEqual([]);
    expect(r.produtos).toHaveLength(1);
    expect(r.produtos[0].codigo).toBe("NX 3631445");
    expect(r.produtos[0].especificacoes).toHaveLength(5);
    expect(r.produtos[0].ean).toBe("7898713250934");
    expect(r.pendencias.filter((p) => p.tipo === "imagem")).toHaveLength(3);
    expect(r.pendencias.filter((p) => p.tipo === "manual")).toHaveLength(1);
  });

  it("converte NCM numérico, EAN numérico e preço texto", async () => {
    const r = await lerPlanilha(await prod(["A1", "Placa", "1.234,50", "sim", 8537109, 7898713250934, null, null, null]));
    expect(r.erros).toEqual([]);
    const p = r.produtos[0];
    expect(p.ncm).toBe("08537109");
    expect(p.ean).toBe("7898713250934");
    expect(p.preco).toBe(1234.5);
    expect(p.ativo).toBe(true);
    expect(p.origem).toBe(0);
    expect(p.unidade).toBe("UN");
    expect(p).not.toHaveProperty("slug");
  });

  it("preço numérico, 'R$ 189,90' e vazio", async () => {
    expect((await lerPlanilha(await prod(["A1", "P", 189.9, "", "", "", "", "", ""]))).produtos[0].preco).toBe(189.9);
    expect((await lerPlanilha(await prod(["A1", "P", "R$ 189,90", "", "", "", "", "", ""]))).produtos[0].preco).toBe(189.9);
    expect((await lerPlanilha(await prod(["A1", "P", "", "", "", "", "", "", ""]))).produtos[0].preco).toBeNull();
  });

  it("ativo 'não' vira false", async () => {
    expect((await lerPlanilha(await prod(["A1", "P", 1, "não", "", "", "", "", ""]))).produtos[0].ativo).toBe(false);
    expect((await lerPlanilha(await prod(["A1", "P", 1, "NAO", "", "", "", "", ""]))).produtos[0].ativo).toBe(false);
  });

  it("NCM inválido gera erro com a linha da planilha", async () => {
    const r = await lerPlanilha(await prod(["A1", "P", 1, "", "123", "", "", "", ""]));
    expect(r.erros).toEqual([{ aba: "Produtos", linha: 2, mensagem: "NCM inválido: informe 8 dígitos." }]);
    expect(r.produtos).toHaveLength(0);
  });

  it("NCM com pontos é aceito", async () => {
    const r = await lerPlanilha(await prod(["A1", "P", 1, "", "8537.10.90", "", "", "", ""]));
    expect(r.produtos[0].ncm).toBe("85371090");
  });

  it("origem fora de 0-8 e ativo desconhecido geram erro", async () => {
    const r1 = await lerPlanilha(await prod(["A1", "P", 1, "", "", "", 9, "", ""]));
    expect(r1.erros[0].mensagem).toBe("Origem inválida: informe um número de 0 a 8.");
    const r2 = await lerPlanilha(await prod(["A1", "P", 1, "talvez", "", "", "", "", ""]));
    expect(r2.erros[0].mensagem).toMatch(/Ativo inválido/);
  });

  it("código repetido gera erro na segunda linha; linha vazia é ignorada", async () => {
    const r = await lerPlanilha(await montar({ produtos: [CAB_PRODUTOS, ["A1", "P"], [], ["A1", "Q"]] }));
    expect(r.produtos).toHaveLength(1);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toMatchObject({ aba: "Produtos", linha: 4 });
  });

  it("especificação e imagem com código inexistente geram erro na própria aba", async () => {
    const r = await lerPlanilha(
      await montar({
        produtos: [CAB_PRODUTOS, ["A1", "P"]],
        especificacoes: [CAB_ESP, ["A1", "Tensão", "24V"], ["ZZ", "x", "y"]],
        imagens: [CAB_IMG, ["ZZ", "https://a.com/i.jpg", ""]],
      }),
    );
    expect(r.produtos[0].especificacoes).toEqual([{ nome: "Tensão", valor: "24V" }]);
    expect(r.erros).toEqual([
      { aba: "Especificacoes", linha: 3, mensagem: "Código não encontrado na aba Produtos." },
      { aba: "Imagens", linha: 2, mensagem: "Código não encontrado na aba Produtos." },
    ]);
  });

  it("imagem https vai para imagens; sem https vira pendência; manual idem", async () => {
    const r = await lerPlanilha(
      await montar({
        produtos: [
          CAB_PRODUTOS,
          ["A1", "P", 1, "", "", "", "", "", "manual.pdf"],
          ["A2", "Q", 1, "", "", "", "", "", "https://a.com/m.pdf"],
        ],
        imagens: [CAB_IMG, ["A1", "https://a.com/i.jpg", "Frente"], ["A1", "foto.png", ""]],
      }),
    );
    expect(r.erros).toEqual([]);
    expect(r.produtos[0].imagens).toEqual([{ url: "https://a.com/i.jpg", alt: "Frente" }]);
    expect(r.produtos[0].manual_url).toBeNull();
    expect(r.produtos[1].manual_url).toBe("https://a.com/m.pdf");
    expect(r.pendencias).toEqual([
      { codigo: "A1", arquivo: "manual.pdf", tipo: "manual" },
      { codigo: "A1", arquivo: "foto.png", tipo: "imagem" },
    ]);
  });

  it("cabeçalhos em outra ordem funcionam", async () => {
    const r = await lerPlanilha(await montar({ produtos: [["nome *", "ncm", "codigo *"], ["Placa", "85371090", "A1"]] }));
    expect(r.erros).toEqual([]);
    expect(r.produtos[0]).toMatchObject({ codigo: "A1", nome: "Placa", ncm: "85371090" });
  });

  it("aceita rich text, fórmula e hiperlink", async () => {
    const r = await lerPlanilha(
      await prod([
        { richText: [{ text: "A" }, { text: "1" }] },
        { formula: "B1", result: "Placa" },
        { formula: "1+1", result: 2 },
        "",
        "",
        "",
        "",
        "",
        { text: "ver", hyperlink: "https://a.com/m.pdf" },
      ]),
    );
    expect(r.erros).toEqual([]);
    expect(r.produtos[0]).toMatchObject({ codigo: "A1", nome: "Placa", preco: 2, manual_url: "https://a.com/m.pdf" });
  });

  it("falta de aba ou coluna obrigatória vira erro", async () => {
    const r1 = await lerPlanilha(await montar({ especificacoes: [["a"]] }));
    expect(r1.erros[0].aba).toBe("Produtos");
    const r2 = await lerPlanilha(await montar({ produtos: [["nome *"], ["x"]] }));
    expect(r2.erros[0]).toMatchObject({ aba: "Produtos", linha: 1 });
  });

  it("arquivo inválido vira erro, não exceção", async () => {
    const r = await lerPlanilha(new TextEncoder().encode("lixo").buffer as ArrayBuffer);
    expect(r.erros).toHaveLength(1);
  });
});
