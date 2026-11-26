"use client";

import { useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import SenhaGerada from "@/components/admin/SenhaGerada";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import {
  anonimizarLojista,
  definirAtivo,
  gerarNovaSenha,

} from "@/services/lojistas-admin";
import { formatarDocumento, somenteDigitos } from "@/lib/validacao/documento";

const botaoContorno =
  "border border-marca-preto px-4 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco disabled:cursor-not-allowed disabled:border-marca-cinza-300 disabled:text-marca-cinza-400 disabled:hover:bg-marca-branco disabled:hover:text-marca-cinza-400";

type Props = { id: string; ativo: boolean; anonimizado: boolean; documento: string | null };

export default function AcoesLojista({ id, ativo, anonimizado, documento }: Props) {
  const [estadoAtivo, acaoAtivo, pendenteAtivo] = useAcao<ResultadoAdmin | null, FormData>(
    async () => definirAtivo(id, !ativo),
    null,
  );
  const [estadoSenha, acaoSenha, pendenteSenha] = useAcao<
    ResultadoAdmin<{ senha: string }> | null,
    FormData
  >(async () => gerarNovaSenha(id), null);
  const [estadoAnon, acaoAnon, pendenteAnon] = useAcao<ResultadoAdmin | null, FormData>(
    async () => anonimizarLojista(id),
    null,
  );
  const [confirmacao, setConfirmacao] = useState("");

  if (anonimizado) {
    return (
      <p className="text-sm text-marca-cinza-600">
        Cliente anonimizado: o acesso está bloqueado e os dados pessoais foram apagados.
      </p>
    );
  }

  const confere =
    documento !== null && somenteDigitos(confirmacao) === somenteDigitos(documento);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-marca-preto">Acesso</h2>
        <div className="flex flex-wrap gap-3">
          <form action={acaoAtivo}>
            <button type="submit" disabled={pendenteAtivo} className={botaoContorno}>
              {ativo ? "Desativar" : "Ativar"}
            </button>
          </form>
          <form action={acaoSenha}>
            <button type="submit" disabled={pendenteSenha} className={botaoContorno}>
              Gerar nova senha
            </button>
          </form>
        </div>
        <p role="alert" className="min-h-5 text-sm text-marca-preto">
          {estadoAtivo && !estadoAtivo.ok ? estadoAtivo.erro : null}
          {estadoSenha && !estadoSenha.ok ? estadoSenha.erro : null}
        </p>
        {estadoSenha?.ok ? <SenhaGerada senha={estadoSenha.dados.senha} /> : null}
      </section>

      <section className="space-y-3 border-t border-marca-cinza-200 pt-6">
        <h2 className="text-lg font-bold text-marca-preto">Anonimizar (LGPD)</h2>
        <p className="max-w-xl text-sm text-marca-cinza-600">
          Apaga os dados pessoais, bloqueia o acesso de forma permanente e libera o CPF/CNPJ
          para um novo cadastro. Os pedidos mantêm os dados fiscais. Esta ação não pode ser
          desfeita.
        </p>
        <form action={acaoAnon} className="max-w-xl space-y-3">
          <div>
            <label htmlFor="confirmacao" className="mb-1 block text-sm font-medium text-marca-cinza-800">
              Digite o CPF/CNPJ para confirmar
            </label>
            <input
              id="confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={documento ? formatarDocumento(documento) : ""}
              autoComplete="off"
              className="w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto"
            />
          </div>
          <button type="submit" disabled={!confere || pendenteAnon} className={botaoContorno}>
            Anonimizar
          </button>
          <p role="alert" className="min-h-5 text-sm text-marca-preto">
            {estadoAnon && !estadoAnon.ok ? estadoAnon.erro : null}
          </p>
        </form>
      </section>
    </div>
  );
}
