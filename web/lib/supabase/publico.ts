import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente anônimo, sem sessão e sem cookies/headers: seguro para páginas públicas
 * estáticas. As respostas são cacheadas por 1h e invalidáveis pela tag "catalogo".
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: 3600, tags: ["catalogo"] },
          } as RequestInit),
      },
    },
  );
}
