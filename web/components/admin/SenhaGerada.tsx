"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";
import Botao from "@/components/ui/Botao";

// A senha vem do estado da ação e vive só na memória deste componente:
// nunca vai para URL, storage ou banco. Ao recarregar, some.
export default function SenhaGerada({ senha }: { senha: string }) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  }

  return (
    <div className="rounded-2xl border border-marca-cinza-200 bg-marca-cinza-50 p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-marca-cinza-700">
        <KeyRound aria-hidden className="size-4" />
        Senha provisória
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code
          data-testid="senha-gerada"
          className="rounded-xl border border-marca-cinza-200 bg-marca-branco px-4 py-2.5 font-mono text-lg tracking-wide break-all text-marca-preto select-all"
        >
          {senha}
        </code>
        <Botao variante="secundario" tamanho="sm" icone={copiada ? Check : Copy} onClick={copiar}>
          {copiada ? "Copiada" : "Copiar"}
        </Botao>
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-marca-preto px-4 py-3 text-sm font-semibold text-marca-branco">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        Esta senha não será exibida novamente
      </p>
      <p className="mt-2 text-sm text-marca-cinza-600">
        Copie agora e envie ao cliente por um canal seguro (WhatsApp ou e-mail).
      </p>
    </div>
  );
}
