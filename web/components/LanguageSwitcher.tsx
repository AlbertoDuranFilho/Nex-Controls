"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";
import { consultaNoIdioma } from "@/lib/consulta-idioma";

const langs = [
  { code: "pt", name: "Português", flag: "/flags/br.png" },
  { code: "en", name: "English", flag: "/flags/us.png" },
  { code: "es", name: "Español", flag: "/flags/es.png" },
];

export default function LanguageSwitcher({ acima = false }: { acima?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = pathname.split("/")[1] || "pt";
  const raiz = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const selectedLang = langs.find((l) => l.code === currentLocale) || langs[0];

  // Fecha com clique fora ou Esc.
  useEffect(() => {
    if (!open) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setOpen(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [open]);

  const handleChange = (lang: string) => {
    const segments = pathname.split("/");
    segments[1] = lang;
    setOpen(false);
    router.push((segments.join("/") || "/") + consultaNoIdioma(window.location.search, currentLocale, lang));
  };

  return (
    <div ref={raiz} className="relative">
      {/* Botão do idioma ativo */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={selectedLang.name}
        className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium text-marca-preto transition duration-150 hover:border-marca-cinza-300 hover:bg-marca-cinza-50 focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none motion-reduce:transition-none ${
          open ? "border-marca-cinza-300 bg-marca-cinza-50" : "border-marca-cinza-200"
        }`}
      >
        <Image src={selectedLang.flag} alt={selectedLang.name} width={20} height={20} className="rounded-full" />
        <span className="hidden xl:inline">{selectedLang.name}</span>
        <ChevronDown
          aria-hidden
          className={`size-4 text-marca-cinza-500 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 z-50 w-48 ${acima ? "bottom-full mb-2" : "top-full mt-2"} rounded-2xl border border-marca-cinza-200 bg-marca-branco p-1.5 shadow-elevada`}>
          {langs.map((lang) => {
            const atual = lang.code === currentLocale;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleChange(lang.code)}
                aria-current={atual ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:cursor-pointer hover:bg-marca-cinza-100 ${
                  atual ? "font-semibold text-marca-preto" : "text-marca-cinza-700 hover:text-marca-preto"
                }`}
              >
                <Image src={lang.flag} alt="" width={18} height={18} className="rounded-full" />
                {lang.name}
                {atual && <Check aria-hidden className="ml-auto size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
