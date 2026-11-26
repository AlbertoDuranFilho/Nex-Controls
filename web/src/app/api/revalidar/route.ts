import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// Invalida o cache do catálogo (tag "catalogo"). Desligado sem REVALIDATE_SECRET:
// usado pelo e2e e por integrações externas; o admin usa a tag direto (Task 5).
export async function POST(request: Request) {
  const segredo = process.env.REVALIDATE_SECRET;
  const recebido = request.headers.get("x-revalidate-secret") ?? "";
  if (!segredo) return new NextResponse(null, { status: 404 });

  const a = Buffer.from(recebido);
  const b = Buffer.from(segredo);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse(null, { status: 401 });
  }

  revalidateTag("catalogo");
  return NextResponse.json({ ok: true });
}
