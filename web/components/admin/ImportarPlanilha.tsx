"use client";

import { useState, useTransition } from "react";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { confirmarImportacao, previaImportacao, type PreviaImportacao } from "@/services/importacao-admin";

const botao =
  "bg-marca-preto px-4 py-2 text-sm font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-300";
const th = "px-4 py-2 font-medium";
const td = "px-4 py-2 text-marca-preto";

type Concluido = Extract<Awaited<ReturnType<typeof confirmarImportacao>>, { ok: true }>["dados"];

export default function ImportarPlanilha() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [concluido, setConcluido] = useState<Concluido | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function formDe(f: File): FormData {
    const fd = new FormData();
    fd.set("arquivo", f);
    return fd;
  }

  function escolher(f: File | null) {
    setArquivo(f);
    setPrevia(null);
    setConcluido(null);
    setMensagem(null);
    if (!f) return;
    iniciar(async () => {
      const r: ResultadoAdmin<PreviaImportacao> = await previaImportacao(formDe(f));
      if (r.ok) setPrevia(r.dados);
      else setMensagem(r.erro);
    });
  }

  function importar() {
    if (!arquivo) return;
    iniciar(async () => {
      const r = await confirmarImportacao(formDe(arquivo));
      if (r.ok) {
        setConcluido(r.dados);
        setPrevia(null);
        setMensagem(null);
      } else {
        setMensagem(r.erro);
      }
    });
  }

  const temErros = (previa?.erros.length ?? 0) > 0;
  const total = (previa?.novos.length ?? 0) + (previa?.atualizados.length ?? 0);

  return (
    <div className="space-y-6">
      <p className="text-marca-cinza-800">
        <a href="/modelos/modelo-produtos.xlsx" download className="text-marca-preto underline underline-offset-2">
          Baixar planilha modelo
        </a>
        . Preencha, salve como .xlsx (até 5 MB) e envie abaixo. Produtos com o mesmo código são atualizados por
        completo.
      </p>

      <div>
        <label htmlFor="arquivo" className="mb-1 block text-sm font-medium text-marca-preto">
          Planilha (.xlsx)
        </label>
        <input
          id="arquivo"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={pendente}
          onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          className="block w-full max-w-md border border-marca-cinza-300 bg-marca-branco px-3 py-2 text-sm text-marca-preto"
        />
      </div>

      {pendente && <p className="text-sm text-marca-cinza-600">Processando…</p>}
      {mensagem && (
        <p role="alert" className="border border-marca-preto px-3 py-2 text-sm text-marca-preto">
          {mensagem}
        </p>
      )}

      {concluido && (
        <div role="status" className="space-y-3 border border-marca-cinza-200 p-4">
          <p className="font-medium text-marca-preto">
            Importação concluída: {concluido.criados} criado(s), {concluido.atualizados} atualizado(s).
          </p>
          <Pendencias itens={concluido.pendencias} />
        </div>
      )}

      {previa && (
        <div className="space-y-6">
          <p className="text-marca-cinza-800">
            {previa.novos.length} novo(s) e {previa.atualizados.length} atualizado(s).
          </p>

          {temErros && (
            <section>
              <h2 className="mb-2 font-semibold text-marca-preto">Erros (corrija a planilha e envie de novo)</h2>
              <div className="overflow-x-auto border border-marca-cinza-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-marca-cinza-50 text-marca-cinza-600">
                    <tr>
                      <th scope="col" className={th}>Aba</th>
                      <th scope="col" className={th}>Linha</th>
                      <th scope="col" className={th}>Problema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.erros.map((e, i) => (
                      <tr key={i} className="border-t border-marca-cinza-200">
                        <td className={td}>{e.aba}</td>
                        <td className={td}>{e.linha}</td>
                        <td className={td}>{e.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <Lista titulo="Novos" itens={previa.novos} />
          <Lista titulo="Atualizados" itens={previa.atualizados} />
          <Pendencias itens={previa.pendencias} />

          <button type="button" onClick={importar} disabled={pendente || temErros || total === 0} className={botao}>
            Importar
          </button>
        </div>
      )}
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 font-semibold text-marca-preto">
        {titulo} ({itens.length})
      </h2>
      <p className="text-sm text-marca-cinza-800">{itens.join(", ")}</p>
    </section>
  );
}

function Pendencias({ itens }: { itens: PreviaImportacao["pendencias"] }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 font-semibold text-marca-preto">Arquivos pendentes ({itens.length})</h2>
      <p className="mb-2 text-sm text-marca-cinza-600">
        Estes arquivos não foram importados porque não são links https://. Envie-os pela tela de edição do produto.
      </p>
      <div className="overflow-x-auto border border-marca-cinza-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-marca-cinza-50 text-marca-cinza-600">
            <tr>
              <th scope="col" className={th}>Código</th>
              <th scope="col" className={th}>Tipo</th>
              <th scope="col" className={th}>Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p, i) => (
              <tr key={i} className="border-t border-marca-cinza-200">
                <td className={td}>{p.codigo}</td>
                <td className={td}>{p.tipo === "manual" ? "Manual" : "Imagem"}</td>
                <td className={td}>{p.arquivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
