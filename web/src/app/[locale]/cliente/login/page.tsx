import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgePercent, Package, Truck } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import LogoNex from "@/components/ui/LogoNex";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next } = await searchParams;
  const t = await getTranslations({ locale, namespace: "login" });

  const beneficios = [
    { icone: BadgePercent, texto: t("beneficios.precos") },
    { icone: Package, texto: t("beneficios.catalogo") },
    { icone: Truck, texto: t("beneficios.pedidos") },
  ];

  return (
    // pt-24 = altura da navbar fixa; a seção ocupa o resto da tela.
    <section className="flex min-h-svh flex-col bg-marca-cinza-100 pt-24 md:grid md:grid-cols-2">
      {/* Lado da marca: faixa no topo no celular, coluna inteira a partir de md. */}
      <div className="relative isolate overflow-hidden bg-linear-to-br from-marca-preto via-marca-cinza-900 to-marca-cinza-800 text-marca-branco">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-size-[56px_56px] mask-[radial-gradient(ellipse_at_top_left,black_20%,transparent_75%)]"
        />
        <div
          aria-hidden
          className="absolute -right-32 -bottom-32 -z-10 size-[28rem] rounded-full bg-marca-branco/[0.06] blur-3xl"
        />

        <div className="flex h-full flex-col items-center px-6 pt-10 pb-20 md:items-start md:justify-center md:px-12 md:py-16 lg:px-20">
          <LogoNex clara className="w-36 md:w-64 lg:w-80" />

          <div className="hidden md:block">
            <p className="mt-10 max-w-md text-2xl leading-snug font-light text-marca-cinza-200 lg:text-3xl">
              {t("slogan")}
            </p>
            <ul className="mt-10 space-y-4">
              {beneficios.map(({ icone: Icone, texto }) => (
                <li key={texto} className="flex items-center gap-3 text-sm text-marca-cinza-300">
                  <span className="grid size-9 place-items-center rounded-xl bg-marca-branco/[0.08] ring-1 ring-marca-branco/10">
                    <Icone aria-hidden className="size-4 text-marca-branco" />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Cartão de acesso. No celular sobe sobre a faixa escura. */}
      <div className="relative z-10 -mt-12 flex flex-1 flex-col items-center justify-center px-4 pb-12 md:mt-0 md:px-10 md:py-16">
        <div className="w-full max-w-md rounded-3xl bg-marca-branco p-7 shadow-elevada ring-1 ring-marca-cinza-200/70 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-marca-cinza-500 uppercase">
            {t("title")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-marca-preto">
            {t("boasVindas")}
          </h1>
          <p className="mt-2 text-[15px] text-marca-cinza-500">{t("subtitulo")}</p>

          <div className="mt-8">
            <LoginForm locale={locale} next={typeof next === "string" ? next : ""} />
          </div>

          <p className="mt-8 border-t border-marca-cinza-100 pt-6 text-center text-sm text-marca-cinza-500">
            {t("naoECliente")}{" "}
            <Link
              href={`/${locale}#contato`}
              className="group inline-flex items-center gap-1 rounded font-semibold text-marca-preto underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
            >
              {t("faleConosco")}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </p>
        </div>

        <Link
          href={`/${locale}`}
          className="group mt-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-marca-cinza-500 transition-colors hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {t("back")}
        </Link>
      </div>
    </section>
  );
}
