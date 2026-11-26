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

// Com código do país (autopreenchimento "+55 81 99999-9999"): 12 ou 13 dígitos começando
// com 55 perdem o 55, senão o DDD viraria "55".
export function mascaraTelefone(valor: string | null | undefined): string {
  let d = somenteDigitos(valor ?? "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
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

// Número com vírgula decimal e até `casas` casas ("." ou "," servem de separador decimal).
// O último separador é o decimal; os anteriores são milhar e somem. Exceção: um único "."
// seguido de exatamente 3 dígitos também é milhar ("1.234" → "1234"), assim como qualquer
// último separador seguido de 3 dígitos quando há outro antes ("1,234" em "1,234.567").
// Vírgula decimal com 3 dígitos digitados ("189,999") só perde a casa extra.
export function mascaraDecimal(valor: string | null | undefined, casas = 2): string {
  const v = (valor ?? "").replace(/[^\d.,]/g, "");
  const i = Math.max(v.lastIndexOf("."), v.lastIndexOf(","));
  if (i < 0) return v;
  const inteiro = v.slice(0, i).replace(/[.,]/g, "");
  const depois = v.slice(i + 1);
  const outros = /[.,]/.test(v.slice(0, i));
  const milhar = /^\d{3}$/.test(depois) && (v[i] === "." || outros);
  if (milhar) return inteiro + depois;
  return `${inteiro},${depois.slice(0, casas)}`;
}

// Tira a vírgula pendurada ("5," → "5") antes de enviar: o servidor não aceita.
export function semVirgulaFinal(valor: string): string {
  return valor.replace(/,$/, "");
}

// Percentual de 0 a 100 com até 2 casas; acima de 100 vira 100.
export function mascaraPercentual(valor: string | null | undefined): string {
  const v = mascaraDecimal(valor, 2);
  const [inteiro, decimais] = v.split(",");
  const parte = inteiro.replace(/^0+(?=\d)/, "").slice(0, 3);
  if (Number(`${parte || "0"}.${decimais ?? ""}`) > 100) return "100";
  return decimais === undefined ? parte : `${parte || "0"},${decimais}`;
}

// Posição do cursor depois de mascarar.
// - Máscaras de dígitos (documento, telefone, CEP): mesma quantidade de dígitos antes dele.
// - Máscaras decimais: ancorada pela direita, mesma quantidade de caracteres úteis depois
//   dele. Na entrada "." conta (pode virar a vírgula); na saída contam dígitos e vírgula.
//   Assim "189." deixa o cursor depois da vírgula nova, e "," → "0," não o empurra.
export function posicaoAposMascara(antes: string, cursor: number, depois: string, decimal = false): number {
  if (decimal) {
    let resto = 0;
    for (let i = Math.max(0, cursor); i < antes.length; i++) if (/[\d.,]/.test(antes[i])) resto++;
    if (resto === 0) return depois.length;
    let vistos = 0;
    for (let i = depois.length - 1; i >= 0; i--) {
      if (/[\d,]/.test(depois[i])) vistos++;
      if (vistos === resto) return i;
    }
    return 0;
  }
  let alvo = 0;
  for (let i = 0; i < cursor && i < antes.length; i++) if (/\d/.test(antes[i])) alvo++;
  if (alvo === 0) return 0;
  let vistos = 0;
  for (let i = 0; i < depois.length; i++) {
    if (/\d/.test(depois[i])) vistos++;
    if (vistos === alvo) return i + 1;
  }
  return depois.length;
}

// Máscaras cujo cursor é ancorado pela direita (ver posicaoAposMascara).
const DECIMAIS = new Set<(v: string) => string>([mascaraDecimal, mascaraPercentual]);
export function ehMascaraDecimal(mascara: (v: string) => string): boolean {
  return DECIMAIS.has(mascara);
}

// Aplica a máscara no próprio input (não controlado ou controlado: quem controla lê
// el.value depois) e devolve o cursor ao lugar certo.
export function aplicarMascara(el: HTMLInputElement, mascara: (valor: string) => string): string {
  const antes = el.value;
  const novo = mascara(antes);
  if (novo === antes) return novo;
  const cursor = el.selectionStart ?? antes.length;
  el.value = novo;
  const pos = posicaoAposMascara(antes, cursor, novo, ehMascaraDecimal(mascara));
  try {
    el.setSelectionRange(pos, pos);
  } catch {
    // tipos sem seleção (ex.: email): fica onde o navegador deixar
  }
  return novo;
}
