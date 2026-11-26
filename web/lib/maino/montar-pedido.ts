import type { ConfigMaino } from "./config";

export type PedidoParaMaino = {
  numero: number;
  cliente_tipo_pessoa: "PF" | "PJ";
  cliente_documento: string;
  cliente_nome: string;
  cliente_indicador_ie: "contribuinte" | "isento" | "nao_contribuinte";
  cliente_inscricao_estadual: string | null;
  entrega_cep: string;
  entrega_logradouro: string;
  entrega_numero: string;
  entrega_complemento: string | null;
  entrega_bairro: string;
  entrega_cidade: string;
  entrega_uf: string;
  frete_valor: number;
  observacao: string | null;
  itens: { codigo: string; nome: string; quantidade: number; preco_unitario: number }[];
  email: string;
  telefone: string | null;
};

const INDICADOR_IE = { contribuinte: 1, isento: 2, nao_contribuinte: 9 } as const;

function separarTelefone(tel: string | null): { ddd: string; telefone: string } | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return null;
  return { ddd: d.slice(0, 2), telefone: d.slice(2) };
}

/** Monta o corpo de `POST /pedidos` da Mainô. Puro: sem rede nem banco. */
export function montarPedidoMaino(
  p: PedidoParaMaino,
  cfg: ConfigMaino,
  ibge: number | null,
): object {
  const doc = p.cliente_tipo_pessoa === "PJ" ? { cnpj: p.cliente_documento } : { cpf: p.cliente_documento };
  const tel = separarTelefone(p.telefone);
  const ie = p.cliente_inscricao_estadual?.trim();

  return {
    numero: `SITE-${p.numero}`,
    ...(p.observacao ? { observacao: p.observacao } : {}),
    cliente: {
      ...doc,
      razao_social: p.cliente_nome,
      indicador_ie: INDICADOR_IE[p.cliente_indicador_ie],
      ...(ie ? { inscricao_estadual: ie } : {}),
      cep: p.entrega_cep,
      uf: p.entrega_uf,
      endereco: p.entrega_logradouro,
      numero: p.entrega_numero,
      ...(p.entrega_complemento ? { complemento: p.entrega_complemento } : {}),
      bairro: p.entrega_bairro,
      ...(ibge !== null ? { municipio: ibge } : {}),
      email: p.email,
      ...(tel ?? {}),
      somente_busca: false,
    },
    itens: p.itens.map((i) => ({
      codigo: i.codigo,
      descricao: i.nome,
      pu: i.preco_unitario,
      quantidade: i.quantidade,
    })),
    modalidade_frete: cfg.modalidadeFrete,
    valor_frete: p.frete_valor,
    ...(cfg.condicaoPagamentoId
      ? {
          cobranca: {
            forma_pagamento: cfg.formaPagamento,
            plano_de_conta: cfg.planoDeConta,
            condicao_pagamento_id: cfg.condicaoPagamentoId,
          },
        }
      : {}),
  };
}
