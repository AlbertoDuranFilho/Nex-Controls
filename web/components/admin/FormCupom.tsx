"use client";

import { useEffect, useState } from "react";
import { useAcao, useTransicao } from "@/lib/react/destravar-transicao";
import { useRouter } from "next/navigation";
import { CalendarRange, Save, TicketPercent } from "lucide-react";
import { AvisoAdmin, CaixaSelecao, CampoAdmin, SeletorAdmin } from "@/components/admin/CamposAdmin";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { PLACEHOLDER, mascaraDecimal } from "@/lib/mascaras";
import { paraDataRecife } from "@/lib/admin/cupom";
import { salvarCupom, type CupomAdmin } from "@/services/cupons-admin";

type Estado = ResultadoAdmin<{ id: string }> | null;

const decimal = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

type Props = {
  cupom?: CupomAdmin;
  locale: string;
  lojistas: { id: string; nome: string }[];
};

export default function FormCupom({ cupom, locale, lojistas }: Props) {
  const router = useRouter();
  const [estado, action, pendenteAcao] = useAcao<Estado, FormData>(salvarCupom, null);
  const [emTransicao, iniciar] = useTransicao();
  const pendente = pendenteAcao || emTransicao;
  const [tipo, setTipo] = useState(cupom?.tipo ?? "percentual");

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
      className="max-w-4xl space-y-6"
    >
      <input type="hidden" name="id" value={cupom?.id ?? ""} />
      <CartaoConta titulo="Desconto" idTitulo="desconto" icone={TicketPercent}>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAdmin id="codigo" label="Código" required defaultValue={cupom?.codigo} placeholder="Ex.: NATAL10" />
          <SeletorAdmin
            id="tipo"
            label="Tipo"
            defaultValue={cupom?.tipo ?? "percentual"}
            onChange={(e) => setTipo(e.target.value === "valor" ? "valor" : "percentual")}
          >
            <option value="percentual">Percentual (%)</option>
            <option value="valor">Valor fixo (R$)</option>
          </SeletorAdmin>
          <CampoAdmin
            id="valor"
            label="Valor"
            inputMode="decimal"
            required
            placeholder={tipo === "valor" ? PLACEHOLDER.preco : PLACEHOLDER.desconto}
            mascara={mascaraDecimal}
            sufixo={tipo === "valor" ? "R$" : "%"}
            defaultValue={decimal(cupom?.valor ?? null)}
          />
          <CampoAdmin
            id="valor_minimo_pedido"
            label="Valor mínimo do pedido (R$)"
            inputMode="decimal"
            placeholder={PLACEHOLDER.preco}
            mascara={mascaraDecimal}
            defaultValue={decimal(cupom?.valor_minimo_pedido ?? null)}
          />
          <SeletorAdmin id="lojista_id" label="Cliente" defaultValue={cupom?.lojista_id ?? ""}>
            <option value="">Todos os clientes</option>
            {lojistas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </SeletorAdmin>
        </div>
      </CartaoConta>

      <CartaoConta titulo="Validade e limite" idTitulo="validade" icone={CalendarRange}>
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoAdmin id="valido_de" label="Válido de" type="date" defaultValue={paraDataRecife(cupom?.valido_de ?? null)} />
          <CampoAdmin id="valido_ate" label="Válido até" type="date" defaultValue={paraDataRecife(cupom?.valido_ate ?? null)} />
          <CampoAdmin
            id="max_usos"
            label="Máximo de usos (vazio = ilimitado)"
            inputMode="numeric"
            placeholder="ilimitado"
            mascara={(v) => v.replace(/\D/g, "")}
            defaultValue={cupom?.max_usos ?? ""}
          />
        </div>
        <div className="mt-5">
          <CaixaSelecao name="ativo" defaultChecked={cupom?.ativo ?? true}>
            Cupom ativo
          </CaixaSelecao>
        </div>
      </CartaoConta>

      <AvisoAdmin tipo={estado?.ok ? "ok" : "erro"}>
        {estado && !estado.ok ? estado.erro : cupom && estado?.ok ? "Cupom salvo." : null}
      </AvisoAdmin>

      <Botao type="submit" carregando={pendente} icone={Save} className="px-6">
        Salvar cupom
      </Botao>
    </form>
  );
}
