"use client";

import { useState } from "react";
import { useTransicao } from "@/lib/react/destravar-transicao";
import {
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileWarning,
  LoaderCircle,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { AvisoAdmin } from "@/components/admin/CamposAdmin";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { confirmarImportacao, previaImportacao, type PreviaImportacao } from "@/services/importacao-admin";

const th = "px-4 py-2.5 font-medium";
const td = "px-4 py-2.5 text-marca-preto";

type Concluido = Extract<Awaited<ReturnType<typeof confirmarImportacao>>, { ok: true }>["dados"];

export default function ImportarPlanilha() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [concluido, setConcluido] = useState<Concluido | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, iniciar] = useTransicao();

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
      <CartaoConta
        titulo="Planilha de produtos"
        idTitulo="planilha"
        icone={FileSpreadsheet}
        descricao="Preencha o modelo, salve como .xlsx (até 4 MB) e envie abaixo."
      >
        <p className="text-sm leading-relaxed text-marca-cinza-700">
          Produtos com o mesmo código são atualizados; sem a aba Especificações ou Imagens, ou com arquivo pendente,
          as especificações, imagens e o manual atuais são mantidos. Preço vazio remove o preço.
        </p>
        <div className="mt-4">
          <a
            href="/modelos/modelo-produtos.xlsx"
            download
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-marca-cinza-300 bg-marca-branco px-5 text-sm font-semibold text-marca-preto transition duration-200 hover:border-marca-preto hover:bg-marca-cinza-50 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          >
            <Download aria-hidden className="size-4" />
            Baixar planilha modelo
          </a>
        </div>

        {/* Zona do arquivo: o input cobre a área inteira (clique ou arrastar e soltar). */}
        <div className="relative mt-6 rounded-2xl border-2 border-dashed border-marca-cinza-300 bg-marca-cinza-50 px-6 py-10 text-center transition-colors focus-within:border-marca-preto focus-within:ring-2 focus-within:ring-marca-preto hover:border-marca-preto motion-reduce:transition-none has-disabled:opacity-60">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-marca-preto text-marca-branco shadow-suave">
            {pendente ? (
              <LoaderCircle aria-hidden className="size-5.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <FileSpreadsheet aria-hidden className="size-5.5" strokeWidth={1.75} />
            )}
          </span>
          <label htmlFor="arquivo" className="mt-4 block text-sm font-semibold text-marca-preto">
            Planilha (.xlsx)
          </label>
          <p className="mt-1 text-sm text-marca-cinza-600">
            {arquivo ? arquivo.name : "Clique para escolher ou arraste o arquivo até aqui"}
          </p>
          <input
            id="arquivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={pendente}
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>

        {pendente ? (
          <p role="status" className="mt-4 text-sm text-marca-cinza-600">
            Processando…
          </p>
        ) : null}
        <AvisoAdmin tipo="erro" className="mt-4 empty:mt-0">
          {mensagem}
        </AvisoAdmin>
      </CartaoConta>

      {concluido && (
        <div role="status" className="rounded-2xl border border-marca-cinza-200 bg-marca-branco p-5 shadow-sm sm:p-7">
          <p className="flex items-center gap-2.5 font-semibold text-marca-preto">
            <CircleCheck aria-hidden className="size-5 shrink-0" />
            Importação concluída: {concluido.criados} criado(s), {concluido.atualizados} atualizado(s).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Selo tom="verde">{concluido.criados} criado(s)</Selo>
            <Selo tom="azul">{concluido.atualizados} atualizado(s)</Selo>
            {concluido.pendencias.length > 0 ? (
              <Selo tom="ambar">{concluido.pendencias.length} arquivo(s) pendente(s)</Selo>
            ) : null}
          </div>
          <div className="mt-5 empty:mt-0">
            <Pendencias itens={concluido.pendencias} />
          </div>
        </div>
      )}

      {previa && (
        <CartaoConta titulo="Prévia da importação" idTitulo="previa" icone={Upload}>
          <p className="text-sm text-marca-cinza-800">
            {previa.novos.length} novo(s) e {previa.atualizados.length} atualizado(s).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Selo tom="verde">{previa.novos.length} novo(s)</Selo>
            <Selo tom="azul">{previa.atualizados.length} atualizado(s)</Selo>
            {temErros ? <Selo tom="vermelho">{previa.erros.length} erro(s)</Selo> : null}
            {previa.pendencias.length > 0 ? (
              <Selo tom="ambar">{previa.pendencias.length} arquivo(s) pendente(s)</Selo>
            ) : null}
          </div>

          <div className="mt-6 space-y-6">
            {temErros && (
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-marca-preto">
                  <TriangleAlert aria-hidden className="size-4" />
                  Erros (corrija a planilha e envie de novo)
                </h3>
                <Tabela colunas={["Aba", "Linha", "Problema"]}>
                  {previa.erros.map((e, i) => (
                    <tr key={i} className="border-t border-marca-cinza-200">
                      <td className={td}>{e.aba}</td>
                      <td className={td}>{e.linha}</td>
                      <td className={td}>{e.mensagem}</td>
                    </tr>
                  ))}
                </Tabela>
              </section>
            )}

            <Lista titulo="Novos" itens={previa.novos} />
            <Lista titulo="Atualizados" itens={previa.atualizados} />
            {previa.precoRemovido.length > 0 && (
              <section role="alert" className="rounded-xl border border-marca-cinza-300 bg-marca-cinza-50 p-4">
                <h3 className="mb-1 flex items-center gap-2 font-semibold text-marca-preto">
                  <TriangleAlert aria-hidden className="size-4" />
                  Preço atual será removido ({previa.precoRemovido.length})
                </h3>
                <p className="mb-2 text-sm text-marca-cinza-600">
                  Estes produtos têm preço hoje e estão sem preço na planilha. Se não for a intenção, preencha o preço.
                </p>
                <p className="text-sm break-words text-marca-cinza-800">{previa.precoRemovido.join(", ")}</p>
              </section>
            )}
            <Pendencias itens={previa.pendencias} />

            <Botao icone={Upload} onClick={importar} disabled={pendente || temErros || total === 0}>
              Importar
            </Botao>
          </div>
        </CartaoConta>
      )}
    </div>
  );
}

function Tabela({ colunas, children }: { colunas: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-marca-cinza-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-marca-cinza-50 text-marca-cinza-600">
          <tr>
            {colunas.map((c) => (
              <th key={c} scope="col" className={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 font-semibold text-marca-preto">
        {titulo} ({itens.length})
      </h3>
      <p className="text-sm break-words text-marca-cinza-800">{itens.join(", ")}</p>
    </section>
  );
}

function Pendencias({ itens }: { itens: PreviaImportacao["pendencias"] }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-marca-preto">
        <FileWarning aria-hidden className="size-4" />
        Arquivos pendentes ({itens.length})
      </h3>
      <p className="mb-2 text-sm text-marca-cinza-600">
        Estes arquivos não foram importados porque não são links https://. Envie-os pela tela de edição do produto.
      </p>
      <Tabela colunas={["Código", "Tipo", "Arquivo"]}>
        {itens.map((p, i) => (
          <tr key={i} className="border-t border-marca-cinza-200">
            <td className={td}>{p.codigo}</td>
            <td className={td}>{p.tipo === "manual" ? "Manual" : "Imagem"}</td>
            <td className={`${td} break-all`}>{p.arquivo}</td>
          </tr>
        ))}
      </Tabela>
    </section>
  );
}
