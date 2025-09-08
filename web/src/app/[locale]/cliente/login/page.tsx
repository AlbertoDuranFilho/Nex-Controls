"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const pathname = usePathname();

  // Extrai o locale da URL (ex.: /pt/cliente/login → "pt")
  const currentLocale = pathname.split("/")[1] || "pt";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // simulação de erro sempre
    setErro(true);
  };

  return (
   
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md relative">
          {/* Botão de Voltar */}
          <button
            onClick={() => router.push(`/${currentLocale}`)}
            className="absolute top-4 left-4 text-sm text-gray-600 hover:text-blue-600 hover:cursor-pointer"
          >
            ← {t("back") ?? "Voltar"}
          </button>

          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {t("title")}
          </h1>
          <form className="space-y-4" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <input
              type="password"
              placeholder={t("password")}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 hover:cursor-pointer font-semibold transition-colors"
            >
              {t("submit")}
            </button>
          </form>

          {/* Área de recuperar senha */}
      
          {/* <p className="mt-4 text-center text-sm text-gray-600">
            {t("forgotPassword")}{" "}
            <a href="#" className="text-blue-600 hover:underline">
              {t("recover")}
            </a>
          </p> */}
        </div>

        {/* Modal de erro */}
        {erro && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-[90%] max-w-sm">
              <h2 className="text-lg font-bold text-center text-red-600 mb-4">
                {t("loginErrorTitle")}
              </h2>
              <p className="text-gray-700 mb-6">
                {t("loginErrorMessage")}
              </p>
              <button
                onClick={() => setErro(false)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer transition-colors"
              >
                {t("okButton")}
              </button>
            </div>
          </div>
        )}
      </div>
    
  );
}