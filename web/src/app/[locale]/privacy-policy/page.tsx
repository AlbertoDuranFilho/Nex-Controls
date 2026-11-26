"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacy");
  const locale = useLocale();

  return (
    <div className="max-w-4xl mx-auto mt-30 px-6 py-12 text-gray-800 leading-relaxed">
      <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
      <p className="text-sm text-gray-500 mb-8">{t("lastUpdate")}</p>

      <p className="mb-4">{t("intro1")}</p>
      <p className="mb-8">{t("intro2")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">1. {t("section1Title")}</h2>
      <p className="mb-4">{t("section1Para1")}</p>
      <p className="mb-2">{t("section1Para2")}</p>
      <ul className="list-disc pl-6 mb-4">
        <li>{t("section1Item1")}</li>
        <li>{t("section1Item2")}</li>
        <li>{t("section1Item3")}</li>
        <li>{t("section1Item4")}</li>
      </ul>
      <p className="mb-4">{t("section1Para3")}</p>
      <p className="mb-8">{t("section1Para4")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">2. {t("section2Title")}</h2>
      <p className="mb-4">{t("section2Para1")}</p>
      <p className="mb-8">{t("section2Para2")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">3. {t("section3Title")}</h2>
      <p className="mb-4">{t("section3Para1")}</p>
      <p className="mb-4">{t("section3Para2")}</p>
      <p className="mb-8">{t("section3Para3")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">4. {t("section4Title")}</h2>
      <p className="mb-4">{t("section4Para1")}</p>
      <p className="mb-2">{t("section4Para2")}</p>
      <ul className="list-disc pl-6 mb-4">
        <li>{t("section4Item1")}</li>
        <li>{t("section4Item2")}</li>
        <li>{t("section4Item3")}</li>
        <li>{t("section4Item4")}</li>
        <li>{t("section4Item5")}</li>
        <li>{t("section4Item6")}</li>
      </ul>
      <p className="mb-8">{t("section4Para3")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">5. {t("section5Title")}</h2>
      <p className="mb-2">{t("section5Para1")}</p>
      <ul className="list-disc pl-6 mb-4">
        <li>{t("section5Item1")}</li>
        <li>{t("section5Item2")}</li>
        <li>{t("section5Item3")}</li>
      </ul>
      <p className="mb-8">{t("section5Para2")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">6. {t("section6Title")}</h2>
      <p className="mb-8">{t("section6Para1")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">7. {t("section7Title")}</h2>
      <p className="mb-2">{t("section7Para1")}</p>
      <ul className="list-disc pl-6 mb-4">
        <li>{t("section7Item1")}</li>
        <li>{t("section7Item2")}</li>
        <li>{t("section7Item3")}</li>
        <li>{t("section7Item4")}</li>
      </ul>
      <p className="mb-8">{t("section7Para2")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">8. {t("sectionCadTitle")}</h2>
      <p className="mb-4">{t("sectionCadPara1")}</p>
      <p className="mb-2">{t("sectionCadPara2")}</p>
      <ul className="list-disc pl-6 mb-4">
        <li>{t("sectionCadItem1")}</li>
        <li>{t("sectionCadItem2")}</li>
        <li>{t("sectionCadItem3")}</li>
        <li>{t("sectionCadItem4")}</li>
        <li>{t("sectionCadItem5")}</li>
        <li>{t("sectionCadItem6")}</li>
      </ul>
      <p className="mb-4">{t("sectionCadPara3")}</p>
      <p className="mb-4">{t("sectionCadPara4")}</p>
      <p className="mb-4">{t("sectionCadPara5")}</p>
      <p className="mb-4">
        {t("sectionCadPara6")}{" "}
        <Link href={`/${locale}/excluir-conta`} className="underline underline-offset-2 hover:text-gray-600">
          {t("deletionLink")}
        </Link>
      </p>
      <p className="mb-8">{t("sectionCadPara7")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">9. {t("section8Title")}</h2>
      <p className="mb-4">{t("section8Para1")}</p>
      <p className="mb-4">{t("section8Para2")}</p>
      <p className="mb-8">{t("section8Para3")}</p>
    </div>
  );
}