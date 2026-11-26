export type TipoDocumento = "PF" | "PJ";

export type ResultadoDocumento =
  | { ok: true; documento: string }
  | { ok: false; erro: "formato" | "digito" };

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function todosIguais(digitos: string): boolean {
  return /^(\d)\1*$/.test(digitos);
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + Number(base[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

const PESOS_CPF_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CPF_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function cpfValido(d: string): boolean {
  const dv1 = digitoVerificador(d, PESOS_CPF_1);
  const dv2 = digitoVerificador(d, PESOS_CPF_2);
  return dv1 === Number(d[9]) && dv2 === Number(d[10]);
}

function cnpjValido(d: string): boolean {
  const dv1 = digitoVerificador(d, PESOS_CNPJ_1);
  const dv2 = digitoVerificador(d, PESOS_CNPJ_2);
  return dv1 === Number(d[12]) && dv2 === Number(d[13]);
}

export function validarDocumento(tipo: TipoDocumento, valor: string): ResultadoDocumento {
  const d = somenteDigitos(valor);
  const tamanho = tipo === "PF" ? 11 : 14;
  if (d.length !== tamanho) return { ok: false, erro: "formato" };
  if (todosIguais(d)) return { ok: false, erro: "digito" };
  const valido = tipo === "PF" ? cpfValido(d) : cnpjValido(d);
  return valido ? { ok: true, documento: d } : { ok: false, erro: "digito" };
}

export function formatarDocumento(documento: string): string {
  const d = somenteDigitos(documento);
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return documento;
}
