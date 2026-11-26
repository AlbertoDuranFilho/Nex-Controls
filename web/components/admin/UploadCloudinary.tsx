"use client";

import { useState } from "react";
import { assinarUpload } from "@/services/produtos-admin";

type Props = { tipo: "image" | "raw"; aoEnviar: (url: string) => void };

const ROTULO = { image: "Enviar imagem", raw: "Enviar PDF" } as const;
const ACEITA = { image: "image/*", raw: "application/pdf" } as const;

export default function UploadCloudinary({ tipo, aoEnviar }: Props) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    setMensagem(null);
    setEnviando(true);
    try {
      const a = await assinarUpload(tipo);
      if (!a.ok) {
        setMensagem(a.erro);
        return;
      }
      const s = a.dados;
      if (arquivo.size > s.maxBytes) {
        setMensagem(`Arquivo maior que ${s.maxBytes / (1024 * 1024)} MB.`);
        return;
      }
      const corpo = new FormData();
      corpo.set("file", arquivo);
      corpo.set("api_key", s.apiKey);
      corpo.set("timestamp", String(s.timestamp));
      corpo.set("folder", s.folder);
      corpo.set("signature", s.signature);
      const r = await fetch(
        `https://api.cloudinary.com/v1_1/${s.cloudName}/${s.resourceType}/upload`,
        { method: "POST", body: corpo },
      );
      const json = (await r.json()) as { secure_url?: string };
      if (!r.ok || !json.secure_url) {
        setMensagem("Falha no envio. Tente novamente.");
        return;
      }
      aoEnviar(json.secure_url);
    } catch {
      setMensagem("Falha no envio. Tente novamente.");
    } finally {
      setEnviando(false);
      input.value = "";
    }
  }

  return (
    <div className="text-sm">
      <label className="inline-block cursor-pointer border border-marca-preto px-3 py-2 font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco">
        {enviando ? "Enviando…" : ROTULO[tipo]}
        <input
          type="file"
          accept={ACEITA[tipo]}
          onChange={escolher}
          disabled={enviando}
          className="sr-only"
        />
      </label>
      <p role="alert" className="mt-1 min-h-5 text-marca-preto">
        {mensagem}
      </p>
    </div>
  );
}
