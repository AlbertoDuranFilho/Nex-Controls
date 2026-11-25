// Sem caracteres ambíguos: nada de I, O, l, 0 ou 1.
const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const DIGITOS = "23456789";
const SIMBOLOS = "!@#$%*";
const ALFABETO = MAIUSCULAS + MINUSCULAS + DIGITOS + SIMBOLOS;
const TAMANHO = 12;

// Índice uniforme em [0, limite) via crypto, sem viés de módulo (rejeição).
function indiceAleatorio(limite: number): number {
  const teto = 0x100000000 - (0x100000000 % limite);
  const v = new Uint32Array(1);
  do {
    crypto.getRandomValues(v);
  } while (v[0] >= teto);
  return v[0] % limite;
}

function escolher(conjunto: string): string {
  return conjunto[indiceAleatorio(conjunto.length)];
}

export function gerarSenhaProvisoria(): string {
  const caracteres = [
    escolher(MAIUSCULAS),
    escolher(MINUSCULAS),
    escolher(DIGITOS),
  ];
  while (caracteres.length < TAMANHO) caracteres.push(escolher(ALFABETO));

  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = indiceAleatorio(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join("");
}
