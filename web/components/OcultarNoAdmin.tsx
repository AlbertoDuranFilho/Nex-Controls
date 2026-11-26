"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ehRotaAdmin } from "@/lib/admin/rota";

// Esconde partes do site (rodapé) dentro do painel admin, que tem shell próprio.
export default function OcultarNoAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (ehRotaAdmin(pathname)) return null;
  return <>{children}</>;
}
