// Máscaras de digitação (puras). Só mudam o que aparece no campo: o servidor continua
// recebendo/validando dígitos (lib/validacao/*) e números (parseDesconto/parseDecimal).
import { somenteDigitos } from "@/lib/validacao/documento";

export const PLACEHOLDER = {
  documento: "000.000.000-00 ou 00.000.000/0000-00",
  telefone: "(81) 99999-9999",
  email: "nome@empresa.com.br",
  cep: "00000-000",
  preco: "0,00",
  desconto: "0",
  inscricaoEstadual: "0321418-40",
} as const;

// CPF até 11 dígitos, CNPJ de 12 a 14. Colar já formatado funciona (só os dígitos contam).
export function mascaraDocumento(valor: string | null | undefined): string {
  const d = somenteDigitos(valor ?? "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Tipo de pessoa pelo tamanho: 11 dígitos → PF, 14 → PJ; outros tamanhos não decidem.
export function tipoPorDocumento(valor: string): "PF" | "PJ" | null {
  const n = somenteDigitos(valor).length;
  if (n === 11) return "PF";
  if (n === 14) return "PJ";
  return null;
}

export function mascaraTelefone(valor: string | null | undefined): string {
  const d = somenteDigitos(valor ?? "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(valor: string | null | undefined): string {
  const d = somenteDigitos(valor ?? "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Número com vírgula decimal e até `casas` casas. Com vírgula, pontos são milhar (somem);
// sem vírgula, o último ponto vira a vírgula ("189.90" → "189,90").
export function mascaraDecimal(valor: string | null | undefined, casas = 2): string {
  let v = (valor ?? "").replace(/[^\d.,]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "");
  else {
    const i = v.lastIndexOf(".");
    if (i >= 0) v = `${v.slice(0, i).replace(/\./g, "")},${v.slice(i + 1)}`;
  }
  const [inteiro = "", ...resto] = v.split(",");
  if (resto.length === 0) return inteiro;
  return `${inteiro},${resto.join("").slice(0, casas)}`;
}

// Percentual de 0 a 100 com até 2 casas; acima de 100 vira 100.
export function mascaraPercentual(valor: string | null | undefined): string {
  const v = mascaraDecimal(valor, 2);
  const [inteiro, decimais] = v.split(",");
  const parte = inteiro.replace(/^0+(?=\d)/, "").slice(0, 3);
  if (Number(`${parte || "0"}.${decimais ?? ""}`) > 100) return "100";
  return decimais === undefined ? parte : `${parte || "0"},${decimais}`;
}

// Posição do cursor depois de mascarar: mesma quantidade de caracteres "úteis" (dígitos,
// e a vírgula nos decimais) antes dele. Sem isso, editar no meio pula o cursor para o fim.
export function posicaoAposMascara(antes: string, cursor: number, depois: string): number {
  const util = /[\d,]/;
  let alvo = 0;
  for (let i = 0; i < cursor && i < antes.length; i++) if (util.test(antes[i])) alvo++;
  if (alvo === 0) return 0;
  let vistos = 0;
  for (let i = 0; i < depois.length; i++) {
    if (util.test(depois[i])) vistos++;
    if (vistos === alvo) return i + 1;
  }
  return depois.length;
}
