import { createServer, type IncomingMessage, type Server } from "node:http";

// Mainô falsa para o e2e. Aceita qualquer Bearer. A nota fica EM_TRANSMISSAO até o teste
// chamar POST /__autorizar/:id (a página do admin também consulta a Mainô ao renderizar,
// então "primeira consulta = em transmissão, seguinte = aceita" não seria determinístico).

export type Requisicao = { metodo: string; caminho: string; corpo: unknown; autorizado: boolean };

export const URL_MAINO_FALSA = "http://127.0.0.1:4010";

const lerCorpo = (req: IncomingMessage) =>
  new Promise<unknown>((resolve) => {
    const partes: Buffer[] = [];
    req.on("data", (c: Buffer) => partes.push(c));
    req.on("end", () => {
      const t = Buffer.concat(partes).toString("utf8");
      try {
        resolve(t ? JSON.parse(t) : null);
      } catch {
        resolve(t);
      }
    });
  });

export function iniciarMainoFalso(): Promise<() => Promise<void>> {
  const requisicoes: Requisicao[] = [];
  const notas = new Map<string, { emitida: boolean; autorizada: boolean; cancelada: boolean }>();
  let proximoId = 9000;

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const caminho = url.pathname;
    const json = (status: number, corpo: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(corpo));
    };

    if (caminho === "/__requisicoes") return json(200, requisicoes);
    const aut = caminho.match(/^\/__autorizar\/([^/]+)$/);
    if (req.method === "POST" && aut) {
      const n = notas.get(aut[1]);
      if (n) n.autorizada = true;
      return json(200, { ok: !!n });
    }

    const corpo = await lerCorpo(req);
    const metodo = req.method ?? "GET";
    requisicoes.push({
      metodo,
      caminho: caminho + url.search,
      corpo,
      autorizado: /^Bearer .+/.test(req.headers.authorization ?? ""),
    });

    if (metodo === "POST" && caminho === "/api/v2/authentication") {
      return json(200, { access_token: "token-falso" });
    }
    if (metodo === "POST" && caminho === "/api/v2/pedidos") {
      const id = String(proximoId++);
      notas.set(id, { emitida: false, autorizada: false, cancelada: false });
      return json(201, { id: Number(id) });
    }
    const m = caminho.match(/^\/api\/v2\/pedidos\/([^/]+)\/nota_fiscal$/);
    const nota = m ? notas.get(m[1]) : undefined;
    if (m && nota) {
      if (metodo === "POST") {
        nota.emitida = true;
        return json(200, {});
      }
      if (metodo === "GET") {
        if (!nota.emitida) return json(404, { error: "Nota fiscal não encontrada" });
        const status = nota.cancelada ? "CANCELADA" : nota.autorizada ? "ACEITA" : "EM_TRANSMISSAO";
        return json(200, {
          nota_fiscal: {
            id: Number(m[1]),
            chave_acesso: "35260100000000000000550010000000011000000011",
            status,
            danfe_url: nota.autorizada ? `https://maino.test/danfe/${m[1]}.pdf` : null,
          },
        });
      }
      if (metodo === "DELETE") {
        nota.cancelada = true;
        res.writeHead(204); // documentado: cancelamento responde 204 sem corpo
        return res.end();
      }
    }
    return json(404, { error: "rota desconhecida" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4010, "127.0.0.1", () => resolve(() => new Promise<void>((r) => server.close(() => r()))));
  });
}
