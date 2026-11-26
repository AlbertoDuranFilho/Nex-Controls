export type MensagemEmail = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  responderPara?: string;
};

/**
 * Envia e-mail pelo Resend. Nunca lança: falha vira `{ ok: false }`.
 * Sem RESEND_API_KEY e fora de produção, apenas simula (console.info).
 */
export async function enviarEmail(m: MensagemEmail): Promise<{ ok: boolean }> {
  const chave = process.env.RESEND_API_KEY?.trim();
  if (!chave) {
    if (process.env.VERCEL_ENV === "production") return { ok: false };
    console.info(`[email simulado] ${m.para} ${m.assunto}`);
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE ?? "Nex Controls <contato@nexcontrols.com>",
        to: [m.para],
        subject: m.assunto,
        html: m.html,
        text: m.texto,
        ...(m.responderPara ? { reply_to: m.responderPara } : {}),
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
