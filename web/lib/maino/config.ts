export type ConfigMaino = {
  apiUrl: string;
  applicationUid: string;
  email: string;
  senha: string;
  condicaoPagamentoId?: string;
  formaPagamento?: number;
  planoDeConta?: string;
  modalidadeFrete: number;
};

const API_PADRAO = "https://api.maino.com.br/api/v2";

function inteiro(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

/** Lê a configuração da Mainô; null se faltar alguma das três credenciais. */
export function lerConfigMaino(env: NodeJS.ProcessEnv = process.env): ConfigMaino | null {
  const applicationUid = env.MAINO_APPLICATION_UID?.trim();
  const email = env.MAINO_EMAIL?.trim();
  const senha = env.MAINO_SENHA;
  if (!applicationUid || !email || !senha) return null;
  return {
    apiUrl: (env.MAINO_API_URL?.trim() || API_PADRAO).replace(/\/+$/, ""),
    applicationUid,
    email,
    senha,
    condicaoPagamentoId: env.MAINO_CONDICAO_PAGAMENTO_ID?.trim() || undefined,
    formaPagamento: inteiro(env.MAINO_FORMA_PAGAMENTO),
    planoDeConta: env.MAINO_PLANO_DE_CONTA?.trim() || undefined,
    modalidadeFrete: inteiro(env.MAINO_MODALIDADE_FRETE) ?? 9,
  };
}
