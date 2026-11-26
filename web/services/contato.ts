"use server";

import { headers } from "next/headers";
import { enviarEmail } from "@/lib/email/enviar";
import { escaparHtml } from "@/lib/email/html";
import { permitirEnvio } from "@/lib/contato/limite";
import { validarContato, type ErrosContato } from "@/lib/contato/validar";

export type EstadoContato = {
  estado: "idle" | "ok" | "erro" | "invalido";
  erros?: ErrosContato;
};

function texto(formData: FormData, campo: string): string {
  const v = formData.get(campo);
  return typeof v === "string" ? v : "";
}

export async function enviarContato(
  _prev: EstadoContato,
  formData: FormData,
): Promise<EstadoContato> {
  const validado = validarContato({
    nome: texto(formData, "nome"),
    email: texto(formData, "email"),
    telefone: texto(formData, "telefone"),
    mensagem: texto(formData, "mensagem"),
    empresa_site: texto(formData, "empresa_site"),
  });
  if (validado.ok === "spam") return { estado: "ok" };
  if (validado.ok === false) return { estado: "invalido", erros: validado.erros };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  if (!permitirEnvio(ip)) return { estado: "erro" };

  const { nome, email, telefone, mensagem } = validado.dados;
  const n = escaparHtml(nome);
  const e = escaparHtml(email);
  const tel = escaparHtml(telefone);
  const m = escaparHtml(mensagem).replace(/\n/g, "<br>");
  const html =
    `<p><strong>Nome:</strong> ${n}</p><p><strong>E-mail:</strong> ${e}</p>` +
    (telefone ? `<p><strong>Telefone:</strong> ${tel}</p>` : "") +
    `<p><strong>Mensagem:</strong></p><p>${m}</p>`;
  const textoPlano =
    `Nome: ${nome}\nE-mail: ${email}\n` +
    (telefone ? `Telefone: ${telefone}\n` : "") +
    `Mensagem:\n${mensagem}`;

  const r = await enviarEmail({
    para: "contato@nexcontrols.com",
    assunto: `Contato pelo site: ${nome.replace(/[\r\n]+/g, " ")}`,
    html,
    texto: textoPlano,
    responderPara: email,
  });
  return { estado: r.ok ? "ok" : "erro" };
}
