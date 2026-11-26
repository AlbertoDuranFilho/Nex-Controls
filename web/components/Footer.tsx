import { useTranslations } from "next-intl";
import Link from "next/link";
import { Mail, ShieldCheck, UserX } from "lucide-react";

export default function Footer({ locale }: { locale?: string }) {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-marca-preto py-10 text-marca-cinza-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-center sm:px-6 md:flex-row md:items-end md:justify-between md:text-left">
        <div>
          <p className="text-sm font-medium text-marca-branco">{t("tagline")}</p>
          <address className="mt-3 space-y-1 text-xs not-italic">
            <p>
              {t("company")} · {t("cnpj")}
            </p>
            <p className="flex items-center justify-center gap-1.5 md:justify-start">
              <Mail aria-hidden className="size-3.5" />
              {t("contact")}:{" "}
              <a
                href="mailto:contato@nexcontrols.com"
                className="rounded text-marca-cinza-300 underline-offset-4 transition-colors hover:text-marca-branco hover:underline focus-visible:ring-2 focus-visible:ring-marca-branco focus-visible:outline-none"
              >
                contato@nexcontrols.com
              </a>
            </p>
          </address>
        </div>
        <p className="text-xs">
          © {currentYear} Nex Controls. {t("rights")}.{" "}
          <Link
            href={`/${locale}/privacy-policy`}
            className="inline-flex items-center gap-1 rounded text-marca-cinza-300 underline-offset-4 transition-colors hover:text-marca-branco hover:underline focus-visible:ring-2 focus-visible:ring-marca-branco focus-visible:outline-none"
          >
            <ShieldCheck aria-hidden className="size-3.5" />
            {t("privacyLink")}
          </Link>
          <span aria-hidden="true" className="mx-1 text-marca-cinza-500">·</span>
          <Link
            href={`/${locale}/excluir-conta`}
            className="inline-flex items-center gap-1 rounded text-marca-cinza-300 underline-offset-4 transition-colors hover:text-marca-branco hover:underline focus-visible:ring-2 focus-visible:ring-marca-branco focus-visible:outline-none"
          >
            <UserX aria-hidden className="size-3.5" />
            {t("deleteAccountLink")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
