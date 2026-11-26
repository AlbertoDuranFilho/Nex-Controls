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
  /** Com `cupom`, os itens estão a preço de tabela e o desconto está só no pedido. */
  desconto_origem: "nenhum" | "cliente" | "cupom";
  desconto_valor: number;
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

const centavos = (v: number) => Math.round(v * 100);

/**
 * Reparte o desconto do cupom (no pedido) entre os itens, como desconto por unidade em
 * centavos, proporcional ao total de cada linha. A Mainô só aceita desconto por unidade
 * (`valor_desconto`, em R$, menor que o preço), então Σ qtd × desconto precisa fechar o
 * total do cupom: o resíduo do arredondamento vai para um item de quantidade 1 (ou cuja
 * quantidade divida o resíduo). Sem esse item, sobra no máximo meio centavo × qtd por
 * linha de diferença (documentado no README).
 */
export function repartirDesconto(itens: { quantidade: number; preco_unitario: number }[], desconto: number): number[] {
  const precos = itens.map((i) => centavos(i.preco_unitario));
  const qtds = itens.map((i) => i.quantidade);
  const linhas = precos.map((p, k) => p * qtds[k]);
  const soma = linhas.reduce((a, b) => a + b, 0);
  const alvo = Math.min(centavos(desconto), soma);
  if (alvo <= 0 || soma <= 0) return itens.map(() => 0);

  // 1. Desconto de cada linha pelo maior resto (Σ = alvo exato).
  const brutos = linhas.map((l) => (alvo * l) / soma);
  const porLinha = brutos.map(Math.floor);
  let falta = alvo - porLinha.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((b, k) => [b - Math.floor(b), k] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, k] of ordem) {
    if (falta <= 0) break;
    porLinha[k] += 1;
    falta -= 1;
  }

  // 2. Por unidade, arredondado e sempre menor que o preço.
  const limitar = (u: number, k: number) => Math.max(0, Math.min(u, precos[k] - 1));
  const unit = porLinha.map((d, k) => limitar(Math.round(d / qtds[k]), k));

  // 3. Resíduo num item que o absorva exatamente.
  const residuo = alvo - unit.reduce((a, u, k) => a + u * qtds[k], 0);
  if (residuo !== 0) {
    const cabe = (k: number) => residuo % qtds[k] === 0 && limitar(unit[k] + residuo / qtds[k], k) === unit[k] + residuo / qtds[k];
    const candidatos = qtds.map((_, k) => k).sort((a, b) => qtds[a] - qtds[b]);
    const k = candidatos.find(cabe);
    if (k !== undefined) unit[k] += residuo / qtds[k];
  }
  return unit.map((u) => u / 100);
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
  // Desconto do cliente já está no preco_unitario; só o cupom precisa ir para os itens.
  const descontos =
    p.desconto_origem === "cupom" && p.desconto_valor > 0
      ? repartirDesconto(p.itens, p.desconto_valor)
      : p.itens.map(() => 0);

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
    itens: p.itens.map((i, k) => ({
      codigo: i.codigo,
      descricao: i.nome,
      pu: i.preco_unitario,
      quantidade: i.quantidade,
      ...(descontos[k] > 0 ? { valor_desconto: descontos[k] } : {}),
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
