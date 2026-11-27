import { textos } from "@/constants/textos";
import type { Database } from "@/types/database";
import { supabase } from "./supabase";

// Dados do lojista para a aba Conta (só leitura nesta fase; edição no site).
// Mesma fonte de web/lib/conta/meu-cadastro.ts, filtrando id = usuário atual além da RLS.

type Lojista = Database["public"]["Tables"]["lojistas"]["Row"];

export type MeuCadastro = Pick<
  Lojista,
  | "nome"
  | "documento"
  | "nome_fantasia"
  | "responsavel_nome"
  | "telefone"
  | "whatsapp"
  | "indicador_ie"
  | "inscricao_estadual"
  | "email"
  | "cep"
  | "logradouro"
  | "numero"
  | "complemento"
  | "bairro"
  | "cidade"
  | "uf"
>;

const COLUNAS =
  "nome, documento, nome_fantasia, responsavel_nome, telefone, whatsapp, indicador_ie, inscricao_estadual, email, " +
  "cep, logradouro, numero, complemento, bairro, cidade, uf";

export async function buscarMeuCadastro(usuarioId: string): Promise<MeuCadastro | null> {
  const { data, error } = await supabase.from("lojistas").select(COLUNAS).eq("id", usuarioId).maybeSingle();
  if (error) throw new Error("Falha ao carregar o cadastro.");
  return (data as unknown as MeuCadastro | null) ?? null;
}

const digitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** CPF 000.000.000-00, CNPJ 00.000.000/0000-00; outro formato fica como veio. */
export function formatarDocumento(v: string | null | undefined): string | null {
  const d = digitos(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v?.trim() || null;
}

/** (81) 99999-0000 / (81) 3333-0000; outro formato fica como veio. */
export function formatarTelefone(v: string | null | undefined): string | null {
  const d = digitos(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v?.trim() || null;
}

export function formatarCep(v: string | null | undefined): string | null {
  const d = digitos(v);
  if (d.length === 8) return d.replace(/(\d{5})(\d{3})/, "$1-$2");
  return v?.trim() || null;
}

/** Endereço em linhas (mesmos campos do site), ou null se o endereço não está completo. */
export function linhasEndereco(c: MeuCadastro): string[] | null {
  if (!c.logradouro || !c.numero || !c.bairro || !c.cidade || !c.uf || !c.cep) return null;
  const complemento = c.complemento ? `, ${c.complemento}` : "";
  return [
    `${c.logradouro}, ${c.numero}${complemento}`,
    `${c.bairro} — ${c.cidade}/${c.uf}`,
    `CEP ${formatarCep(c.cep)}`,
  ];
}

export function rotuloIndicadorIe(v: MeuCadastro["indicador_ie"] | null | undefined): string | null {
  if (!v) return null;
  return textos.conta.indicadores[v] ?? null;
}
