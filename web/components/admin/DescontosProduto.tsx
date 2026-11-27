"use client";

import { useState } from "react";
import { useTransicao } from "@/lib/react/destravar-transicao";
import { useRouter } from "next/navigation";
import { BadgePercent, Plus, Trash2 } from "lucide-react";
import { AvisoAdmin } from "@/components/admin/CamposAdmin";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { PLACEHOLDER, aplicarMascara, mascaraPercentual, semVirgulaFinal } from "@/lib/mascaras";
import {
  definirDescontoProduto,
  removerDescontoProduto,
  type DescontoProduto,
} from "@/services/descontos-admin";


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
    <CartaoConta
      titulo="Descontos por produto"
      idTitulo="descontos-produto"
      icone={BadgePercent}
      descricao="O desconto do produto vale no lugar do desconto geral do cliente, para aquele produto."
    >
      {descontos.length === 0 ? (
        <p className="rounded-xl bg-marca-cinza-50 px-4 py-3 text-sm text-marca-cinza-600">Nenhum desconto por produto.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-marca-cinza-200">
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
                  <td className="px-4 py-3 whitespace-nowrap text-marca-cinza-800">{d.codigo}</td>
                  <td className="px-4 py-3 text-marca-preto">{d.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Selo tom="escuro">{String(d.desconto_percentual).replace(".", ",")}%</Selo>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Botao
                      variante="fantasma"
                      tamanho="sm"
                      icone={Trash2}
                      disabled={pendente}
                      onClick={() => executar(() => removerDescontoProduto(lojistaId, d.produto_id))}
                    >
                      Remover
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
        <div>
          <label htmlFor="desc-produto" className={estiloRotulo}>Produto</label>
          <select id="desc-produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={estiloCampo}>
            <option value="">Selecione…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{`${p.codigo} — ${p.nome}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="desc-pct" className={estiloRotulo}>Desconto do produto (%)</label>
          <div className="relative">
            <input
              id="desc-pct"
              type="text"
              inputMode="decimal"
              placeholder={PLACEHOLDER.desconto}
              value={percentual}
              onChange={(e) => setPercentual(aplicarMascara(e.currentTarget, mascaraPercentual, e.nativeEvent, percentual))}
              onBlur={() => setPercentual((p) => semVirgulaFinal(p))}
              className={`${estiloCampo} pr-10`}
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-marca-cinza-500">
              %
            </span>
          </div>
        </div>
        <Botao
          variante="secundario"
          icone={Plus}
          className="min-h-12"
          carregando={pendente}
          onClick={() =>
            executar(() => definirDescontoProduto(lojistaId, produtoId, semVirgulaFinal(percentual)), () => {
              setProdutoId("");
              setPercentual("");
            })
          }
        >
          Definir desconto
        </Botao>
      </div>
      <AvisoAdmin tipo="erro" className="mt-4 empty:mt-0">{mensagem}</AvisoAdmin>
    </CartaoConta>
  );
}
