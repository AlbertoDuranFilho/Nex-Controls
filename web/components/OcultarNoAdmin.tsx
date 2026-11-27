"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { semTopoDoSite } from "@/lib/admin/rota";

// Esconde partes do site (rodapé, aviso de cookies) no painel admin, que tem shell próprio, e no login.
export default function OcultarNoAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (semTopoDoSite(pathname)) return null;
  return <>{children}</>;
}
