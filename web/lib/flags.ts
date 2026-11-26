export const flags = {
  trocaSenha: process.env.FEATURE_TROCA_SENHA === "true",
  pagamentoOnline: process.env.FEATURE_PAGAMENTO_ONLINE === "true",
  nfeAutomatica: process.env.FEATURE_NFE_AUTOMATICA === "true",
};
