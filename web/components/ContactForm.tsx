"use client";

import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslations } from "next-intl";

export default function ContactForm() {
  const t = useTranslations("contact");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setWhatsapp] = useState("");

  const [modalStatus, setModalStatus] = useState<"idle" | "success" | "error">("idle");

  const [captchaDone, setCaptchaDone] = useState(false);
  
  console.log("SITE KEY carregada:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
  
  // Callback quando o usuário confirma o reCAPTCHA
  function setCaptcha(value: string | null) {
    setCaptchaDone(!!value);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!captchaDone) {
      alert("⚠️ Por favor, confirme o CAPTCHA antes de enviar.");
      return;
    }

    const payload = {
      data: { nome, email, telefone},
    };

    console.log("📤 Enviando para Strapi:", payload);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/contatoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("📥 Resposta do Strapi:", result);

      if (!res.ok) throw new Error(result?.error?.message || "Erro desconhecido");

      setModalStatus("success");
      setNome(""); setEmail(""); setWhatsapp("");
    } catch (err) {
      console.error("❌ Erro ao enviar:",err);
      setModalStatus("error");
    }
  }

 return (
    <section className="bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-2 mb-6">
          {t('title')}
        </h2>

        <form
          id="contato"
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row items-center gap-4 justify-center outline-none focus:border-blue-700 focus:outline focus:outline-blue-700"
        >
          <input
            type="text"
            name='nome'
            placeholder={t('form.name')}
            required
            onChange={(e) => setNome(e.target.value)}
            className="border px-4 py-2 rounded w-full md:w-60 outline-none focus:border-blue-700 focus:outline focus:outline-blue-700"
          />
          <input
            type="email"
            name="email"
            placeholder={t('form.email')}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="border px-4 py-2 rounded w-full md:w-60 outline-none focus:border-blue-700 focus:outline focus:outline-blue-700"
          />
          <input
            type="text"
            name="telefone"
            value={telefone}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            placeholder={t('form.phone')}
            className="border px-4 py-2 rounded w-full md:w-60 outline-none focus:border-blue-700 focus:outline focus:outline-blue-700" 
          />

          {/* Captcha */}
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string}
            onChange={setCaptcha}
          />

          <button
            type="submit"
            disabled={!captchaDone}
            className="bg-blue-900 text-white px-6 py-2 font-semibold cursor-pointer rounded hover:bg-blue-700 transition-colors"
          >
            {t('form.submit')}
          </button>
        </form>
      </div>

      {/* Modal de sucesso/erro */}
    {modalStatus !== "idle" && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-[90%] max-w-sm text-center">
          {modalStatus === "success" ? (
            <>
              <h2 className="text-lg font-bold text-green-600 mb-4">
                {t("successTitle")}
              </h2>
              <p className="text-gray-700 mb-6">
                {t("successMessage")}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-red-600 mb-4">
                {t("errorTitle")}
              </h2>
              <p className="text-gray-700 mb-6">
                {t("errorMessage")}
              </p>
            </>
          )}
          <button
            onClick={() => setModalStatus("idle")}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
          >
            {t("okButton")}
          </button>
        </div>
      </div>
    )}
    </section>
  );
}