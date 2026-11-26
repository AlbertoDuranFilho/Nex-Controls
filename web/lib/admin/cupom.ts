// Validação pura do formulário de cupom do painel admin (sem I/O).
import { opcional, texto, UUID } from "@/lib/admin/formulario";
import { parseDecimal } from "@/lib/admin/produto";

export type DadosCupom = {
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  valor_minimo_pedido: number | null;
  valido_de: string | null;
  valido_ate: string | null;
  max_usos: number | null;
  lojista_id: string | null;
  ativo: boolean;
};

export type ResultadoCupom = { ok: true; dados: DadosCupom } | { ok: false; erro: string };

const CODIGO = /^[A-Z0-9_-]{3,30}$/;
// America/Recife é UTC-3 o ano todo (sem horário de verão).
const FUSO = "-03:00";

// "2026-12-25" vira início do dia (ou fim, se `fim`); "2026-12-25T10:30" vira o minuto exato.
function lerData(valor: string, fim: boolean): string | null | undefined {
  if (!valor) return null;
  let iso: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) iso = `${valor}T${fim ? "23:59:59" : "00:00:00"}${FUSO}`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valor)) {
    iso = `${valor.length === 16 ? `${valor}:00` : valor}${FUSO}`;
  } else return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function validarCupom(form: FormData): ResultadoCupom {
  const codigo = texto(form, "codigo").toUpperCase();
  if (!CODIGO.test(codigo)) {
    return { ok: false, erro: "Código inválido: use de 3 a 30 letras, números, hífen ou sublinhado." };
  }

  const tipo = texto(form, "tipo");
  if (tipo !== "percentual" && tipo !== "valor") return { ok: false, erro: "Tipo de cupom inválido." };

  const valor = parseDecimal(texto(form, "valor"));
  if (valor === null || Number.isNaN(valor) || valor <= 0) {
    return { ok: false, erro: "Informe um valor maior que zero." };
  }
  if (tipo === "percentual" && valor > 100) {
    return { ok: false, erro: "Percentual deve ser maior que 0 e no máximo 100." };
  }
  if (Math.round(valor * 100) / 100 !== valor) {
    return { ok: false, erro: "Use no máximo 2 casas decimais no valor." };
  }

  const minimo = parseDecimal(texto(form, "valor_minimo_pedido"));
  if (minimo !== null && Number.isNaN(minimo)) {
    return { ok: false, erro: "Valor mínimo do pedido inválido." };
  }

  const de = lerData(texto(form, "valido_de"), false);
  const ate = lerData(texto(form, "valido_ate"), true);
  if (de === undefined || ate === undefined) return { ok: false, erro: "Data de validade inválida." };
  if (de && ate && new Date(ate) < new Date(de)) {
    return { ok: false, erro: "O fim da validade deve ser igual ou posterior ao início." };
  }

  const usosBruto = texto(form, "max_usos");
  let maxUsos: number | null = null;
  if (usosBruto) {
    if (!/^\d{1,9}$/.test(usosBruto) || Number(usosBruto) < 1) {
      return { ok: false, erro: "Máximo de usos deve ser um número inteiro maior ou igual a 1." };
    }
    maxUsos = Number(usosBruto);
  }

  const lojista = opcional(form, "lojista_id");
  if (lojista && !UUID.test(lojista)) return { ok: false, erro: "Cliente inválido." };

  return {
    ok: true,
    dados: {
      codigo,
      tipo,
      valor,
      valor_minimo_pedido: minimo,
      valido_de: de,
      valido_ate: ate,
      max_usos: maxUsos,
      lojista_id: lojista,
      ativo: form.get("ativo") === "on",
    },
  };
}
