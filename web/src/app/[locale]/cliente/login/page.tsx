import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/LoginForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next } = await searchParams;
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <div className="flex min-h-screen items-center justify-center bg-marca-cinza-100 px-4 pt-28 pb-12">
      <div className="w-full max-w-md border border-marca-cinza-200 bg-marca-branco p-8">
        <Link
          href={`/${locale}`}
          className="mb-6 inline-block text-sm text-marca-cinza-600 hover:text-marca-preto"
        >
          ← {t("back")}
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-marca-preto">{t("title")}</h1>
        <LoginForm locale={locale} next={typeof next === "string" ? next : ""} />
      </div>
    </div>
  );
}
