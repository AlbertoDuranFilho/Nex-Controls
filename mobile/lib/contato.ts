import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";
import { contato } from "@/constants/contato";
import { textos } from "@/constants/textos";
import { SITE_URL } from "./supabase";

// Contato com a Nex: WhatsApp (quando houver número) ou e-mail. Abre o app do usuário
// (WhatsApp/cliente de e-mail); se nada abrir, mostra o e-mail para ele escrever.

export type Mensagem = { assunto: string; texto: string };

export function linkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

export function linkEmail(email: string, { assunto, texto }: Mensagem): string {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
}

export function temWhatsApp(): boolean {
  return typeof contato.whatsapp === "string" && contato.whatsapp.replace(/\D/g, "").length >= 10;
}

async function abrir(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

function avisarFalha() {
  Alert.alert(textos.conta.erroAbrirTitulo, textos.conta.erroAbrir(contato.email));
}

export async function abrirEmail(mensagem: Mensagem): Promise<boolean> {
  const ok = await abrir(linkEmail(contato.email, mensagem));
  if (!ok) avisarFalha();
  return ok;
}

export async function abrirWhatsApp(mensagem: Mensagem): Promise<boolean> {
  if (!temWhatsApp() || !contato.whatsapp) return abrirEmail(mensagem);
  const ok = await abrir(linkWhatsApp(contato.whatsapp, mensagem.texto));
  // sem WhatsApp instalado/link recusado: cai no e-mail
  return ok || abrirEmail(mensagem);
}

/** Canal preferido: WhatsApp se a Nex tiver número; senão e-mail. */
export function abrirContato(mensagem: Mensagem): Promise<boolean> {
  return temWhatsApp() ? abrirWhatsApp(mensagem) : abrirEmail(mensagem);
}

/** Página do site (documento, ex.: política de privacidade) no navegador dentro do app. */
export async function abrirPaginaDoSite(caminho: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(`${SITE_URL}${caminho}`);
  } catch {
    avisarFalha();
  }
}
