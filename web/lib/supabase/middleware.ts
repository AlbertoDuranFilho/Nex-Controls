import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { propagarCookiesParaRequest } from "./cookies";

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{
  response: NextResponse;
  user: User | null;
  papel: "admin" | "lojista" | null;
}> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          propagarCookiesParaRequest(request, response);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Usado apenas para decidir redirect; a autorizacao real e RLS.
  const p = user?.app_metadata?.papel;
  const papel = p === "admin" || p === "lojista" ? p : null;

  return { response, user, papel };
}
