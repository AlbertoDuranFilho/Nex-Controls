"use client";

import { useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import { KeyRound, Power, PowerOff, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import SenhaGerada from "@/components/admin/SenhaGerada";
import { AvisoAdmin } from "@/components/admin/CamposAdmin";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { anonimizarLojista, definirAtivo, gerarNovaSenha } from "@/services/lojistas-admin";
import { mascaraDocumento } from "@/lib/mascaras";
import { somenteDigitos } from "@/lib/validacao/documento";

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
      <p className="flex items-start gap-3 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-5 text-sm text-marca-cinza-700 shadow-sm">
        <UserX aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-cinza-500" />
        Cliente anonimizado: o acesso está bloqueado e os dados pessoais foram apagados.
      </p>
    );
  }

  const confere =
    documento !== null && somenteDigitos(confirmacao) === somenteDigitos(documento);
  const erroAcesso =
    (estadoAtivo && !estadoAtivo.ok ? estadoAtivo.erro : null) ??
    (estadoSenha && !estadoSenha.ok ? estadoSenha.erro : null);

  return (
    <div className="space-y-6">
      <CartaoConta titulo="Acesso" idTitulo="acesso" icone={ShieldCheck}>
        <div className="flex flex-wrap gap-3">
          <form action={acaoAtivo}>
            <Botao type="submit" variante="secundario" icone={ativo ? PowerOff : Power} carregando={pendenteAtivo}>
              {ativo ? "Desativar" : "Ativar"}
            </Botao>
          </form>
          <form action={acaoSenha}>
            <Botao type="submit" variante="secundario" icone={KeyRound} carregando={pendenteSenha}>
              Gerar nova senha
            </Botao>
          </form>
        </div>
        <AvisoAdmin tipo="erro" className="mt-4 empty:mt-0">
          {erroAcesso}
        </AvisoAdmin>
        {estadoSenha?.ok ? (
          <div className="mt-4">
            <SenhaGerada senha={estadoSenha.dados.senha} />
          </div>
        ) : null}
      </CartaoConta>

      <CartaoConta
        titulo="Anonimizar (LGPD)"
        idTitulo="anonimizar"
        icone={ShieldAlert}
        descricao="Apaga os dados pessoais, bloqueia o acesso de forma permanente e libera o CPF/CNPJ para um novo cadastro. Os pedidos mantêm os dados fiscais. Esta ação não pode ser desfeita."
      >
        <form action={acaoAnon} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="confirmacao" className={estiloRotulo}>
              Digite o CPF/CNPJ para confirmar
            </label>
            <input
              id="confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(mascaraDocumento(e.target.value))}
              inputMode="numeric"
              placeholder={documento ? mascaraDocumento(documento) : ""}
              autoComplete="off"
              className={estiloCampo}
            />
          </div>
          <Botao type="submit" variante="secundario" icone={UserX} disabled={!confere} carregando={pendenteAnon}>
            Anonimizar
          </Botao>
          <AvisoAdmin tipo="erro">{estadoAnon && !estadoAnon.ok ? estadoAnon.erro : null}</AvisoAdmin>
        </form>
      </CartaoConta>
    </div>
  );
}
