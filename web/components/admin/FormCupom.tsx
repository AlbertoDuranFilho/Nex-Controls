"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { salvarCupom, type CupomAdmin } from "@/services/cupons-admin";

const campo =
  "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto";
const rotulo = "mb-1 block text-sm font-medium text-marca-cinza-800";
const botao =
  "bg-marca-preto px-6 py-3 font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500";

type Estado = ResultadoAdmin<{ id: string }> | null;

// America/Recife é UTC-3 fixo: converte o instante para o valor de datetime-local.
function paraLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

const decimal = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

type Props = {
  cupom?: CupomAdmin;
  locale: string;
  lojistas: { id: string; nome: string }[];
};

export default function FormCupom({ cupom, locale, lojistas }: Props) {
  const router = useRouter();
  const [estado, action, pendenteAcao] = useActionState<Estado, FormData>(salvarCupom, null);
  const [emTransicao, iniciar] = useTransition();
  const pendente = pendenteAcao || emTransicao;

  // Cupom recém-criado vai para a edição (reenviar criaria de novo).
  const criadoId = !cupom && estado?.ok ? estado.dados.id : null;
  useEffect(() => {
    if (criadoId) router.replace(`/${locale}/admin/cupons/${criadoId}`);
  }, [criadoId, locale, router]);

  return (
    <form
      onSubmit={(ev) => {
        // Sem action={...}: o React 19 limparia os campos quando a validação falha.
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        iniciar(() => action(dados));
      }}
      className="max-w-3xl space-y-5"
    >
      <input type="hidden" name="id" value={cupom?.id ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="codigo" className={rotulo}>Código</label>
          <input id="codigo" name="codigo" type="text" required defaultValue={cupom?.codigo ?? ""} className={campo} />
        </div>
        <div>
          <label htmlFor="tipo" className={rotulo}>Tipo</label>
          <select id="tipo" name="tipo" defaultValue={cupom?.tipo ?? "percentual"} className={campo}>
            <option value="percentual">Percentual (%)</option>
            <option value="valor">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <label htmlFor="valor" className={rotulo}>Valor</label>
          <input id="valor" name="valor" type="text" inputMode="decimal" required defaultValue={decimal(cupom?.valor ?? null)} className={campo} />
        </div>
        <div>
          <label htmlFor="valor_minimo_pedido" className={rotulo}>Valor mínimo do pedido (R$)</label>
          <input id="valor_minimo_pedido" name="valor_minimo_pedido" type="text" inputMode="decimal" defaultValue={decimal(cupom?.valor_minimo_pedido ?? null)} className={campo} />
        </div>
        <div>
          <label htmlFor="valido_de" className={rotulo}>Válido de</label>
          <input id="valido_de" name="valido_de" type="datetime-local" defaultValue={paraLocal(cupom?.valido_de ?? null)} className={campo} />
        </div>
        <div>
          <label htmlFor="valido_ate" className={rotulo}>Válido até</label>
          <input id="valido_ate" name="valido_ate" type="datetime-local" defaultValue={paraLocal(cupom?.valido_ate ?? null)} className={campo} />
        </div>
        <div>
          <label htmlFor="max_usos" className={rotulo}>Máximo de usos (vazio = ilimitado)</label>
          <input id="max_usos" name="max_usos" type="text" inputMode="numeric" defaultValue={cupom?.max_usos ?? ""} className={campo} />
        </div>
        <div>
          <label htmlFor="lojista_id" className={rotulo}>Cliente</label>
          <select id="lojista_id" name="lojista_id" defaultValue={cupom?.lojista_id ?? ""} className={campo}>
            <option value="">Todos os clientes</option>
            {lojistas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-marca-preto">
        <input type="checkbox" name="ativo" defaultChecked={cupom?.ativo ?? true} />
        Cupom ativo
      </label>

      {estado && !estado.ok ? (
        <p role="alert" className="border border-marca-cinza-300 bg-marca-cinza-50 px-3 py-2 text-sm text-marca-preto">
          {estado.erro}
        </p>
      ) : null}
      {cupom && estado?.ok ? (
        <p role="alert" className="border border-marca-cinza-300 bg-marca-cinza-50 px-3 py-2 text-sm text-marca-preto">
          Cupom salvo.
        </p>
      ) : null}

      <button type="submit" disabled={pendente} className={botao}>
        Salvar cupom
      </button>
    </form>
  );
}
