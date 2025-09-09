"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-col md:flex-row items-center justify-between z-50 shadow-lg">
      <p className="text-sm mb-2 md:mb-0">
        Usamos cookies para melhorar sua experiência no site. Leia nossa{" "}
        <Link href="/privacy-policy" className="underline text-blue-300">
          Política de Privacidade
        </Link>.
      </p>
      <div className="flex gap-3">
        <button
          onClick={acceptCookies}
          className="bg-blue-600 px-4 py-2 text-sm rounded hover:bg-blue-700"
        >
          Aceitar
        </button>
        <button
          onClick={declineCookies}
          className="bg-gray-600 px-4 py-2 text-sm rounded hover:bg-gray-700"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}