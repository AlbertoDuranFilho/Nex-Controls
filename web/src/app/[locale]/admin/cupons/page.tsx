import { Pencil, Plus, TicketPercent } from "lucide-react";
import { redirect } from "next/navigation";
import BotaoCupomAtivo from "@/components/admin/BotaoCupomAtivo";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { CelulaAdmin, LinhaAdmin, TabelaAdmin, VazioAdmin } from "@/components/admin/TabelaAdmin";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarCupons } from "@/services/cupons-admin";
import { listarLojistas } from "@/services/lojistas-admin";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });

export default async function ListaCuponsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const [cupons, lojistas] = await Promise.all([listarCupons(), listarLojistas()]);
  const nomes = new Map(lojistas.map((l) => [l.id, l.nome]));

  return (
    <div>
      <CabecalhoAdmin titulo="Cupons" descricao="Descontos por código, para todos ou para um cliente.">
        <Botao href={`/${locale}/admin/cupons/novo`} icone={Plus}>
          Novo cupom
        </Botao>
      </CabecalhoAdmin>

      {cupons.length === 0 ? (
        <VazioAdmin icone={TicketPercent}>Nenhum cupom cadastrado.</VazioAdmin>
      ) : (
        <TabelaAdmin
          colunas={[
            "Código",
            "Desconto",
            "Validade",
            "Usos",
            "Cliente",
            "Status",
            <span key="a" className="sr-only">Ações</span>,
          ]}
        >
          {cupons.map((c) => (
            <LinhaAdmin key={c.id}>
              <CelulaAdmin className="font-medium whitespace-nowrap text-marca-preto">{c.codigo}</CelulaAdmin>
              <CelulaAdmin rotulo="Desconto" className="whitespace-nowrap">
                {c.tipo === "percentual" ? `${String(c.valor).replace(".", ",")}%` : brl.format(c.valor)}
              </CelulaAdmin>
              <CelulaAdmin rotulo="Validade" className="text-marca-cinza-800 md:whitespace-nowrap">
                {c.valido_de || c.valido_ate
                  ? `${c.valido_de ? data.format(new Date(c.valido_de)) : "…"} a ${c.valido_ate ? data.format(new Date(c.valido_ate)) : "…"}`
                  : "Sem limite"}
              </CelulaAdmin>
              <CelulaAdmin rotulo="Usos" className="whitespace-nowrap">{`${c.usos} / ${c.max_usos ?? "ilimitado"}`}</CelulaAdmin>
              <CelulaAdmin rotulo="Cliente" className="text-marca-cinza-800">
                <span className="break-words">
                  {c.lojista_id ? (nomes.get(c.lojista_id) ?? "Cliente específico") : "Todos"}
                </span>
              </CelulaAdmin>
              <CelulaAdmin rotulo="Status">
                <Selo tom={c.ativo ? "verde" : "neutro"}>{c.ativo ? "Ativo" : "Inativo"}</Selo>
              </CelulaAdmin>
              <CelulaAdmin alinhar="direita" className="justify-end gap-1 whitespace-nowrap">
                <Botao href={`/${locale}/admin/cupons/${c.id}`} variante="fantasma" tamanho="sm" icone={Pencil}>
                  Editar
                </Botao>
                <BotaoCupomAtivo id={c.id} ativo={c.ativo} />
              </CelulaAdmin>
            </LinhaAdmin>
          ))}
        </TabelaAdmin>
      )}
    </div>
  );
}
