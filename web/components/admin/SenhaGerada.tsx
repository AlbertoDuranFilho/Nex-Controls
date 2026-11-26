"use client";

import { useState } from "react";

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
    <div className="border border-marca-preto bg-marca-cinza-50 p-5">
      <p className="text-sm font-medium text-marca-cinza-800">Senha provisória</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code
          data-testid="senha-gerada"
          className="bg-marca-branco px-3 py-2 font-mono text-lg tracking-wide text-marca-preto select-all"
        >
          {senha}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="border border-marca-preto px-3 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco"
        >
          {copiada ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p className="mt-3 text-sm font-semibold text-marca-preto">
        Esta senha não será exibida novamente
      </p>
      <p className="mt-1 text-sm text-marca-cinza-600">
        Copie agora e envie ao cliente por um canal seguro (WhatsApp ou e-mail).
      </p>
    </div>
  );
}
