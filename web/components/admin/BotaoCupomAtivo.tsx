"use client";

import { Power, PowerOff } from "lucide-react";
import Botao from "@/components/ui/Botao";
import { useAcao } from "@/lib/react/destravar-transicao";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { definirCupomAtivo } from "@/services/cupons-admin";

export default function BotaoCupomAtivo({ id, ativo }: { id: string; ativo: boolean }) {
  const [estado, acao, pendente] = useAcao<ResultadoAdmin | null, FormData>(
    async () => definirCupomAtivo(id, !ativo),
    null,
  );
  return (
    <form action={acao} className="inline-flex items-center">
      <Botao type="submit" variante="fantasma" tamanho="sm" icone={ativo ? PowerOff : Power} carregando={pendente}>
        {ativo ? "Desativar" : "Ativar"}
      </Botao>
      {estado && !estado.ok ? (
        <span role="alert" className="ml-2 max-w-48 text-xs break-words whitespace-normal text-marca-cinza-800">
          {estado.erro}
        </span>
      ) : null}
    </form>
  );
}
