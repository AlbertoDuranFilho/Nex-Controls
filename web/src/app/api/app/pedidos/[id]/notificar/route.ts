import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarPedido } from "@/services/pedidos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chamada pelo app Android logo depois de gerar o pedido (envia os e-mails).
// Autentica pelo access_token do Supabase; sem CORS (app nativo).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cabecalho = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(cabecalho)?.[1]?.trim();
  if (!token) return new NextResponse(null, { status: 401 });

  const admin = createAdminClient();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth?.user) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  // id que não é UUID daria erro do Postgres: trata como inexistente.
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, lojista_id, notificado_em")
    .eq("id", id)
    .eq("lojista_id", auth.user.id)
    .maybeSingle();
  if (!pedido) return new NextResponse(null, { status: 404 });

  if (pedido.notificado_em) return NextResponse.json({ jaNotificado: true });

  const enviado = await notificarPedido(pedido.id);
  return NextResponse.json({ enviado });
}
