"use client";

import { useTranslations } from "next-intl";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacy"); // se você quiser traduzir via next-intl

  return (
    <>
    <div className="max-w-4xl mx-auto px-6 pt-30 py-12 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      <p className="mb-4">
        {t("intro")}
      </p>

      <p className="mb-4">
        {t("cookies")}
      </p>

      <p className="mb-4">
        {t("rights")}
        <a href="mailto:comercial@nexcontrols.com" className="text-blue-600 underline">
          {t("email")}
        </a>.
      </p>

      <p className="mt-6 text-sm text-gray-600">
        {t("lastUpdate")} {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
    </>
  );
}