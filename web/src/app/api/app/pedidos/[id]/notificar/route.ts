import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarPedido } from "@/services/pedidos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function vazio(status: number) {
  return new NextResponse(null, { status });
}

// Chamada pelo app Android logo depois de gerar o pedido (envia os e-mails).
// Autentica pelo access_token do Supabase; sem CORS (app nativo).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cabecalho = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(cabecalho)?.[1]?.trim();
  if (!token) return vazio(401);

  const admin = createAdminClient();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth?.user) return vazio(401);
  const usuario = auth.user.id;

  const { id } = await params;
  // id que não é UUID daria erro do Postgres: trata como inexistente.
  if (!UUID.test(id)) return vazio(404);

  // Reserva atômica: só uma chamada consegue marcar notificado_em (sem e-mail duplicado).
  const { data: reservado, error: erroReserva } = await admin
    .from("pedidos")
    .update({ notificado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("lojista_id", usuario)
    .is("notificado_em", null)
    .select("id");
  if (erroReserva) return vazio(500);

  if (!reservado || reservado.length === 0) {
    const { data: pedido, error: erroLeitura } = await admin
      .from("pedidos")
      .select("id")
      .eq("id", id)
      .eq("lojista_id", usuario)
      .maybeSingle();
    if (erroLeitura) return vazio(500);
    if (!pedido) return vazio(404);
    return NextResponse.json({ jaNotificado: true });
  }

  const desfazer = async () => {
    try {
      await admin.from("pedidos").update({ notificado_em: null }).eq("id", id).eq("lojista_id", usuario);
    } catch {
      // melhor esforço
    }
  };

  let enviado: boolean;
  try {
    enviado = await notificarPedido(id);
  } catch {
    await desfazer();
    return NextResponse.json({ erro: "falha_ao_notificar" }, { status: 502 });
  }
  if (!enviado) {
    await desfazer();
    return NextResponse.json({ enviado: false });
  }
  return NextResponse.json({ enviado: true });
}
