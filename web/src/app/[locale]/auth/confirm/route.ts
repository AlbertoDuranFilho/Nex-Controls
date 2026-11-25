import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localeValido } from "@/lib/conta/campos";
import { resultadoConfirmacao } from "@/lib/conta/confirmacao";

type Ctx = { params: Promise<{ locale: string }> };

// Link do e-mail de troca de endereço. Com "confirmar nos dois e-mails", o primeiro link só
// confirma um lado (estado "pendente"); o segundo conclui a troca ("confirmado").
export async function GET(request: NextRequest, { params }: Ctx) {
  const { locale: bruto } = await params;
  const locale = localeValido(bruto);
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");

  const destino = (resultado: "confirmado" | "pendente" | "erro") => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/cliente`;
    url.search = `?email=${resultado}`;
    return NextResponse.redirect(url);
  };

  if (tipo !== "email_change" || !tokenHash || tokenHash.length > 256) return destino("erro");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: "email_change",
    token_hash: tokenHash,
  });
  return destino(resultadoConfirmacao(error, data?.user));
}
