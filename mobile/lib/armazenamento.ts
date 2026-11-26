import * as SecureStore from "expo-secure-store";

// O SecureStore do Android avisa/falha acima de ~2 KB por chave, e a sessão do
// Supabase (JWT + refresh + usuário) passa disso. Guardamos em pedaços:
//   <chave>.n  -> quantidade de pedaços
//   <chave>.0 … <chave>.(n-1) -> pedaços do texto
// 600 caracteres por pedaço = no máximo 1800 bytes mesmo com acentos (3 bytes em UTF-8).
export const TAMANHO_PEDACO = 600;

// Chaves do SecureStore só aceitam letras, números, ".", "-" e "_".
function chaveSegura(chave: string): string {
  return chave.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function dividirEmPedacos(valor: string, tamanho = TAMANHO_PEDACO): string[] {
  const pedacos: string[] = [];
  let inicio = 0;
  while (inicio < valor.length) {
    let fim = Math.min(inicio + tamanho, valor.length);
    // não corta um par substituto (emoji etc.) ao meio
    const ultimo = valor.charCodeAt(fim - 1);
    if (fim < valor.length && ultimo >= 0xd800 && ultimo <= 0xdbff) fim -= 1;
    pedacos.push(valor.slice(inicio, fim));
    inicio = fim;
  }
  return pedacos.length > 0 ? pedacos : [""];
}

async function lerQuantidade(base: string): Promise<number> {
  const texto = await SecureStore.getItemAsync(`${base}.n`);
  const n = texto === null ? 0 : Number(texto);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function apagarPedacos(base: string, aPartirDe: number, ate: number): Promise<void> {
  for (let i = aPartirDe; i < ate; i++) {
    await SecureStore.deleteItemAsync(`${base}.${i}`);
  }
}

/** Adaptador de armazenamento para o supabase-js (interface getItem/setItem/removeItem). */
export const armazenamentoSeguro = {
  async getItem(chave: string): Promise<string | null> {
    const base = chaveSegura(chave);
    const n = await lerQuantidade(base);
    if (n === 0) return null;
    const pedacos: string[] = [];
    for (let i = 0; i < n; i++) {
      const pedaco = await SecureStore.getItemAsync(`${base}.${i}`);
      if (pedaco === null) return null; // gravação incompleta: trata como sem sessão
      pedacos.push(pedaco);
    }
    return pedacos.join("");
  },

  // Não é atômico: se o app morrer no meio (ou duas gravações se cruzarem), os pedaços
  // podem misturar sessão velha e nova. O texto vira JSON inválido, o supabase-js o descarta
  // e o usuário só precisa entrar de novo — falha segura, nunca uma sessão "trocada".
  async setItem(chave: string, valor: string): Promise<void> {
    const base = chaveSegura(chave);
    const anterior = await lerQuantidade(base);
    const pedacos = dividirEmPedacos(valor);
    for (let i = 0; i < pedacos.length; i++) {
      await SecureStore.setItemAsync(`${base}.${i}`, pedacos[i]);
    }
    await SecureStore.setItemAsync(`${base}.n`, String(pedacos.length));
    await apagarPedacos(base, pedacos.length, anterior);
  },

  async removeItem(chave: string): Promise<void> {
    const base = chaveSegura(chave);
    const n = await lerQuantidade(base);
    await SecureStore.deleteItemAsync(`${base}.n`);
    await apagarPedacos(base, 0, n);
  },
};
