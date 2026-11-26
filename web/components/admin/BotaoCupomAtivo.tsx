"use client";

import { useActionState } from "react";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { definirCupomAtivo } from "@/services/cupons-admin";

export default function BotaoCupomAtivo({ id, ativo }: { id: string; ativo: boolean }) {
  const [estado, acao, pendente] = useActionState<ResultadoAdmin | null, FormData>(
    async () => definirCupomAtivo(id, !ativo),
    null,
  );
  return (
    <form action={acao} className="inline">
      <button
        type="submit"
        disabled={pendente}
        className="text-marca-preto underline underline-offset-2 disabled:text-marca-cinza-400"
      >
        {ativo ? "Desativar" : "Ativar"}
      </button>
      {estado && !estado.ok ? (
        <span role="alert" className="ml-2 text-xs text-marca-cinza-800">
          {estado.erro}
        </span>
      ) : null}
    </form>
  );
}
