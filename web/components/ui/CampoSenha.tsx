"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Lock } from "lucide-react";
import Campo, { type CampoProps } from "./Campo";

// Senha com botão de olho: Eye mostra, EyeOff (olho cortado) oculta.
export default function CampoSenha({
  icone = Lock,
  ...resto
}: Omit<CampoProps, "type" | "acessorio">) {
  const t = useTranslations("login");
  const [mostrar, setMostrar] = useState(false);
  const Olho = mostrar ? EyeOff : Eye;

  return (
    <Campo
      {...resto}
      icone={icone}
      type={mostrar ? "text" : "password"}
      acessorio={
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          aria-label={mostrar ? t("ocultarSenha") : t("mostrarSenha")}
          aria-pressed={mostrar}
          aria-controls={resto.id}
          className="grid size-9 place-items-center rounded-lg text-marca-cinza-500 transition hover:bg-marca-cinza-100 hover:text-marca-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-preto active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <Olho aria-hidden className="size-[18px]" />
        </button>
      }
    />
  );
}
