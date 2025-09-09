import { useTranslations } from "next-intl";

export default function InfoBanner() {
  const t = useTranslations("infoBanner")
  return (
    <div className="absolute bottom-0 left-0 w-full z-30">
    <div className="hidden md:flex bg-blue-900/90 text-white divide-x divide-white/20">
      <div className="flex-1 flex items-center justify-center gap-2 py-4">
         <div className="text-center">
          <p className="font-bold">{t("appTitle")}</p>
          <p className="text-sm">{t("appTitle")}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
         <div className="text-center">
          <p className="font-bold">{t("supportTitle")}</p>
          <p className="text-sm">{t("supportSubtitle")}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
         <div className="text-center">
          <p className="font-bold">{t("exportTitle")}</p>
          <p className="text-sm">{t("exportSubtitle")}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
         <div className="text-center">
          <p className="font-bold">{t("secureTitle")}</p>
          <p className="text-sm">{t("secureSubtitle")}</p>
        </div>
      </div>
    </div>
  </div>
  );
}