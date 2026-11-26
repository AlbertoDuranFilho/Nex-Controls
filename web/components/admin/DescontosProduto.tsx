"use client";

import { useState } from "react";
import { useTransicao } from "@/lib/react/destravar-transicao";
import { useRouter } from "next/navigation";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import {
  definirDescontoProduto,
  removerDescontoProduto,
  type DescontoProduto,
} from "@/services/descontos-admin";

const campo =
  "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-2 text-marca-preto outline-none focus:border-marca-preto";
const botaoSec =
  "border border-marca-preto px-3 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  lojistaId: string;
  descontos: DescontoProduto[];
  produtos: { id: string; codigo: string; nome: string }[];
};

export default function DescontosProduto({ lojistaId, descontos, produtos }: Props) {
  const router = useRouter();
  const [produtoId, setProdutoId] = useState("");
  const [percentual, setPercentual] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, iniciar] = useTransicao();

  function executar(fn: () => Promise<ResultadoAdmin>, aoSucesso?: () => void) {
    setMensagem(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setMensagem(r.erro);
      else {
        aoSucesso?.();
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-marca-preto">Descontos por produto</h2>
      <p className="text-sm text-marca-cinza-600">
        O desconto do produto vale no lugar do desconto geral do cliente, para aquele produto.
      </p>

      {descontos.length === 0 ? (
        <p className="text-sm text-marca-cinza-600">Nenhum desconto por produto.</p>
      ) : (
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Código</th>
                <th scope="col" className="px-4 py-3 font-medium">Produto</th>
                <th scope="col" className="px-4 py-3 font-medium">Desconto</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {descontos.map((d) => (
                <tr key={d.produto_id} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3 whitespace-nowrap">{d.codigo}</td>
                  <td className="px-4 py-3 text-marca-preto">{d.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{String(d.desconto_percentual).replace(".", ",")}%</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => executar(() => removerDescontoProduto(lojistaId, d.produto_id))}
                      className="text-marca-preto underline underline-offset-2 disabled:text-marca-cinza-400"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="desc-produto" className="mb-1 block text-sm font-medium text-marca-cinza-800">Produto</label>
          <select id="desc-produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={campo}>
            <option value="">Selecione…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{`${p.codigo} — ${p.nome}`}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label htmlFor="desc-pct" className="mb-1 block text-sm font-medium text-marca-cinza-800">Desconto do produto (%)</label>
          <input
            id="desc-pct"
            type="text"
            inputMode="decimal"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className={campo}
          />
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            executar(() => definirDescontoProduto(lojistaId, produtoId, percentual), () => {
              setProdutoId("");
              setPercentual("");
            })
          }
          className={botaoSec}
        >
          Definir desconto
        </button>
      </div>
      {mensagem ? (
        <p role="alert" className="text-sm text-marca-preto">{mensagem}</p>
      ) : null}
    </section>
  );
}
