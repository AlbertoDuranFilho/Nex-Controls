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

// Máscara: recebe o texto do campo e se ele veio colado/autopreenchido (mais de uma tecla
// de uma vez). Algumas regras só valem para texto colado.
export type Mascara = (valor: string, colado?: boolean) => string;

// Código do país ("+55 81 99999-9999"): 12 ou 13 dígitos começando com 55 perdem o 55, mas só
// quando o texto foi colado/autopreenchido ou começa com "+55". Digitando, um DDD 55 com um
// dígito a mais não é cortado.
export function mascaraTelefone(valor: string | null | undefined, colado = false): string {
  const bruto = valor ?? "";
  let d = somenteDigitos(bruto);
  const comPais = colado || /^\s*\+\s*55/.test(bruto);
  if (comPais && (d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
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
// O último separador é o decimal; os anteriores são milhar e somem.
// Só em texto colado: um "." único seguido de exatamente 3 dígitos é milhar ("1.234" → "1234"),
// assim como o último separador seguido de 3 dígitos quando há outro antes ("1,234.567").
// Digitando, casas a mais são cortadas (e aplicarMascara recusa a tecla, ver mascararEntrada):
// "1.23" + "4" continua "1,23", nunca vira 1234.
export function mascaraDecimal(valor: string | null | undefined, colado = false, casas = 2): string {
  const v = (valor ?? "").replace(/[^\d.,]/g, "");
  const i = Math.max(v.lastIndexOf("."), v.lastIndexOf(","));
  if (i < 0) return v;
  const inteiro = v.slice(0, i).replace(/[.,]/g, "");
  const depois = v.slice(i + 1);
  const outros = /[.,]/.test(v.slice(0, i));
  if (colado && /^\d{3}$/.test(depois) && (v[i] === "." || outros)) return inteiro + depois;
  return `${inteiro},${depois.slice(0, casas)}`;
}

// Tira a vírgula pendurada ("5," → "5") antes de enviar: o servidor não aceita.
export function semVirgulaFinal(valor: string): string {
  return valor.replace(/,$/, "");
}

// Percentual de 0 a 100 com até 2 casas; acima de 100 vira 100.
export function mascaraPercentual(valor: string | null | undefined, colado = false): string {
  const v = mascaraDecimal(valor, colado);
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
const DECIMAIS = new Set<Mascara>([mascaraDecimal, mascaraPercentual]);
export function ehMascaraDecimal(mascara: Mascara): boolean {
  return DECIMAIS.has(mascara);
}

const CASAS = 2;

// Núcleo puro de aplicarMascara: valor anterior (já mascarado), texto novo do campo, cursor
// no texto novo e se veio colado. Devolve o valor mascarado e o cursor.
// Decimal digitado tecla a tecla com casas demais: a tecla é recusada (valor anterior,
// cursor onde estava).
export function mascararEntrada(
  anterior: string,
  antes: string,
  cursor: number,
  mascara: Mascara,
  colado: boolean,
): { valor: string; cursor: number } {
  const decimal = ehMascaraDecimal(mascara);
  if (decimal && !colado && antes.length === anterior.length + 1) {
    const limpo = antes.replace(/[^\d.,]/g, "");
    const i = Math.max(limpo.lastIndexOf("."), limpo.lastIndexOf(","));
    if (i >= 0 && limpo.length - i - 1 > CASAS) return { valor: anterior, cursor: Math.max(0, cursor - 1) };
  }
  const valor = mascara(antes, colado);
  if (valor === antes) return { valor, cursor };
  return { valor, cursor: posicaoAposMascara(antes, cursor, valor, decimal) };
}

// Colado: colar, arrastar, autopreenchimento ou o valor mudou mais de um caractere de uma vez.
const TIPOS_COLADO = new Set(["insertFromPaste", "insertFromDrop", "insertReplacementText", "insertFromYank"]);
export function veioColado(anterior: string, atual: string, inputType?: string): boolean {
  if (inputType && TIPOS_COLADO.has(inputType)) return true;
  return atual.length - anterior.length > 1;
}

// Último valor mascarado de cada campo (para saber o que mudou na próxima tecla).
const ultimos = new WeakMap<HTMLInputElement, string>();

// Aplica a máscara no próprio input (não controlado ou controlado: quem controla lê
// el.value depois) e devolve o cursor ao lugar certo. Passe o evento nativo (inputType).
export function aplicarMascara(el: HTMLInputElement, mascara: Mascara, evento?: Event): string {
  const antes = el.value;
  // Controlado: o React mantém defaultValue = valor atual; não controlado: o WeakMap.
  const anterior = ultimos.get(el) ?? el.defaultValue;
  const inputType = (evento as InputEvent | undefined)?.inputType;
  const cursor = el.selectionStart ?? antes.length;
  const r = mascararEntrada(anterior, antes, cursor, mascara, veioColado(anterior, antes, inputType));
  ultimos.set(el, r.valor);
  if (r.valor === antes) return r.valor;
  el.value = r.valor;
  try {
    el.setSelectionRange(r.cursor, r.cursor);
  } catch {
    // tipos sem seleção (ex.: email): fica onde o navegador deixar
  }
  return r.valor;
}
