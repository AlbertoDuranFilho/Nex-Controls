// Paleta e medidas do app. Preto e branco premium, mesma marca do site.
// Use sempre estes tokens nas telas; nada de cor solta no meio do código.

export const cores = {
  preto: "#0A0A0A",
  branco: "#FFFFFF",
  // fundo das telas: um cinza quase branco, para os cartões brancos se destacarem
  fundo: "#F5F5F4",
  superficie: "#FFFFFF",
  cinza50: "#FAFAFA",
  cinza100: "#F4F4F5",
  cinza200: "#E4E4E7",
  cinza300: "#D4D4D8",
  cinza400: "#A1A1AA",
  cinza500: "#71717A",
  cinza600: "#52525B",
  cinza700: "#3F3F46",
  cinza800: "#27272A",
  texto: "#0A0A0A",
  textoSuave: "#52525B",
  textoFraco: "#71717A",
  textoInverso: "#FFFFFF",
  borda: "#E4E4E7",
  bordaForte: "#0A0A0A",
  erro: "#B91C1C",
  erroFundo: "#FEF2F2",
  sucesso: "#15803D",
  sucessoFundo: "#F0FDF4",
  aviso: "#A16207",
  avisoFundo: "#FEFCE8",
  info: "#1D4ED8",
  infoFundo: "#EFF6FF",
} as const;

export const raios = {
  pequeno: 8,
  botao: 12,
  campo: 12,
  cartao: 16,
  cartaoPequeno: 12,
  pill: 999,
} as const;

export const espacos = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontes = {
  tamanho: {
    legenda: 12,
    pequeno: 13,
    corpo: 15,
    destaque: 17,
    subtitulo: 20,
    titulo: 26,
    tituloGrande: 32,
  },
  peso: {
    normal: "400",
    medio: "500",
    semibold: "600",
    negrito: "700",
  },
} as const;

// Alvo de toque mínimo (acessibilidade).
export const ALVO_MINIMO = 44;

export const sombras = {
  cartao: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flutuante: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const tema = { cores, raios, espacos, fontes, sombras, ALVO_MINIMO } as const;
export type Tema = typeof tema;
