"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const langs = [
  { code: "pt", name: "Português", flag: "/flags/br.png" },
  { code: "en", name: "English", flag: "/flags/us.png" },
  { code: "es", name: "Español", flag: "/flags/es.png" }
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = pathname.split("/")[1] || "pt";

  const [open, setOpen] = useState(false);
  const selectedLang = langs.find(l => l.code === currentLocale) || langs[0];

  const handleChange = (lang: string) => {
    const segments = pathname.split("/");
    segments[1] = lang;
    setOpen(false);
    router.push(segments.join("/") || "/");
  };

  return (
    <div className="relative">
      {/* Botão do idioma ativo */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-gray-100"
      >
        <Image
          src={selectedLang.flag}
          alt={selectedLang.name}
          width={20}
          height={20}
        />
        <span className="hidden sm:inline">{selectedLang.name}</span>
        <svg
          className="w-4 h-4 ml-1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg py-2 z-50">
          {langs.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 hover:cursor-pointer ${
                lang.code === currentLocale ? "font-semibold text-red-600" : "text-gray-700"
              }`}
            >
              <Image src={lang.flag} alt={lang.name} width={18} height={18} />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}