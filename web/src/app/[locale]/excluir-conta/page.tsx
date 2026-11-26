import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

// Página pública de exclusão de conta (exigência da Google Play para apps com conta):
// como pedir, o que é apagado e o que fica guardado. Mesmo fluxo de anonimização do admin.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "excluirConta" });
  return { title: t("metaTitle") };
}

export default async function ExcluirContaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "excluirConta" });

  return (
    <div className="max-w-4xl mx-auto mt-30 px-6 py-12 text-gray-800 leading-relaxed">
      <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
      <p className="mb-8">{t("intro")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">1. {t("howTitle")}</h2>
      <p className="mb-4">{t("how1")}</p>
      <p className="mb-4">{t("how2")}</p>
      <p className="mb-8">{t("how3")}</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">2. {t("deletedTitle")}</h2>
      <ul className="list-disc pl-6 mb-8">
        <li>{t("deleted1")}</li>
        <li>{t("deleted2")}</li>
        <li>{t("deleted3")}</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4">3. {t("keptTitle")}</h2>
      <ul className="list-disc pl-6 mb-8">
        <li>{t("kept1")}</li>
        <li>{t("kept2")}</li>
        <li>{t("kept3")}</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-4">4. {t("timeTitle")}</h2>
      <p className="mb-8">{t("time1")}</p>

      <p className="mb-8">
        {t("moreInfo")}{" "}
        <Link href={`/${locale}/privacy-policy`} className="underline underline-offset-2 hover:text-gray-600">
          {t("privacyLink")}
        </Link>
        .
      </p>
    </div>
  );
}
