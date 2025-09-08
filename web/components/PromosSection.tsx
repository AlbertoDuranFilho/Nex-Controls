import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function PromosSection() {
  const t = useTranslations("banners");

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Banner App */}
        <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-6 flex items-center text-white overflow-hidden">
          {/* Conteúdo textos na esquerda */}
          <div className="z-10 flex flex-col justify-center max-w-[60%]">
            <h2 className="text-xl font-bold">{t("app.title")}</h2>
            <p className="text-2xl font-extrabold">{t("app.headline")}</p>
            <p className="mt-2 text-sm opacity-90">{t("app.description")}</p>

            {/* Botões App Store / Play Store */}
            <div className="flex gap-3 mt-6">
              <Link href={"/"}>
                <Image
                  src="/badges/google_play.webp"
                  alt={t("app.googlePlayAlt")}
                  width={130}
                  height={50}
                />
              </Link>
              <Link href={"/"}>
                <Image
                  src="/badges/apple_store.webp"
                  alt={t("app.appStoreAlt")}
                  width={130}
                  height={50}
                />
              </Link>
            </div>
          </div>

          {/* Imagem decorativa no lado direito */}
          <div className="absolute right-0 top-0 w-1/2 flex items-end justify-center opacity-90">
            <Image
              src="/images/app_site_fundo.png" // 👉 sua arte da mão com o celular
              alt="App Nex Controls"
              width={280}
              height={400}
              className="object-contain drop-shadow-xl"
            />
          </div>
        </div>

        {/* Banner Pegada Social / Sustentabilidade */}
        <div className="rounded-xl overflow-hidden relative">
          <Image
            src="/images/banner-esg.png"
            alt="Responsabilidade Social e Ambiental"
            width={600}
            height={300}
            className="object-cover w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}