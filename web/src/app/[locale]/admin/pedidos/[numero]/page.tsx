import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AcoesPedido from "@/components/admin/AcoesPedido";
import PainelNfe from "@/components/admin/PainelNfe";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { formatarMoeda } from "@/lib/formatar";
import { STATUS_PEDIDO } from "@/lib/pedidos/transicoes";
import { formatarDocumento } from "@/lib/validacao/documento";
import { flags } from "@/lib/flags";
import { sincronizarSePendente } from "@/services/nfe-sincronizar";
import { obterPedidoAdmin } from "@/services/pedidos-admin";

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });
const moeda = (v: number) => formatarMoeda(v, "pt-BR");

type Props = { params: Promise<{ locale: string; numero: string }> };

export default async function PedidoAdminPage({ params }: Props) {
  const { locale, numero } = await params;
  if (!(await ehAdmin())) redirect(`/${locale}`);
  if (!/^\d{1,15}$/.test(numero)) notFound();
  let p = await obterPedidoAdmin(Number(numero));
  if (!p) notFound();

  // Nota ainda em andamento: consulta a Mainô antes de renderizar. Falha não quebra a página.
  if (flags.nfeAutomatica && (p.nfe_status === "NAO_TRANSMITIDA" || p.nfe_status === "EM_TRANSMISSAO")) {
    await sincronizarSePendente(p.id); // não lança e não revalida (render)
    p = (await obterPedidoAdmin(Number(numero))) ?? p;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${locale}/admin/pedidos`} className="text-sm text-marca-cinza-600 hover:text-marca-preto">
          ← Pedidos
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-marca-preto">
          Pedido #{p.numero} — {STATUS_PEDIDO[p.status]}
        </h1>
        <p className="mt-1 text-sm text-marca-cinza-600">{dataHora.format(new Date(p.created_at))}</p>
      </div>

      <section aria-labelledby="cliente" className="text-sm text-marca-cinza-800">
        <h2 id="cliente" className="mb-2 text-lg font-semibold text-marca-preto">Cliente e entrega</h2>
        <p className="font-medium text-marca-preto">{p.cliente_nome}</p>
        <p>
          {p.cliente_tipo_pessoa === "PJ" ? "CNPJ" : "CPF"} {formatarDocumento(p.cliente_documento)}
          {p.cliente_inscricao_estadual ? ` · IE ${p.cliente_inscricao_estadual}` : ""}
        </p>
        <p>{[p.email, p.telefone].filter(Boolean).join(" · ")}</p>
        <p className="mt-2">{p.entrega}</p>
        {p.observacao ? (
          <p className="mt-2">
            <span className="font-medium">Observação:</span> {p.observacao}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="itens">
        <h2 id="itens" className="mb-3 text-lg font-semibold text-marca-preto">Itens</h2>
        <div className="overflow-x-auto border border-marca-cinza-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-marca-cinza-50 text-marca-cinza-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Produto</th>
                <th scope="col" className="px-4 py-3 font-medium">Qtd.</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Preço unit.</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {p.itens.map((i) => (
                <tr key={i.codigo} className="border-t border-marca-cinza-200">
                  <td className="px-4 py-3">
                    <span className="block text-marca-preto">{i.nome}</span>
                    <span className="text-xs text-marca-cinza-600">{i.codigo}</span>
                  </td>
                  <td className="px-4 py-3">{i.quantidade}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{moeda(i.preco_unitario)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{moeda(i.total_linha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{moeda(p.subtotal)}</dd></div>
          {p.desconto_valor > 0 ? (
            <div className="flex justify-between">
              <dt>{p.desconto_origem === "cupom" ? `Cupom ${p.cupom_codigo ?? ""}`.trim() : "Desconto do cliente"}</dt>
              <dd>-{moeda(p.desconto_valor)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between"><dt>Frete</dt><dd>{p.frete_valor > 0 ? moeda(p.frete_valor) : "a combinar"}</dd></div>
          <div className="flex justify-between border-t border-marca-cinza-200 pt-2 text-base font-semibold text-marca-preto">
            <dt>Total</dt><dd>{moeda(p.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="acoes">
        <h2 id="acoes" className="mb-3 text-lg font-semibold text-marca-preto">Status e nota fiscal</h2>
        <div className="max-w-md">
          <AcoesPedido
            pedidoId={p.id}
            numero={p.numero}
            status={p.status}
            notaId={p.maino_nota_id}
            notaUrl={p.maino_nota_url}
            notificado={p.notificado}
          />
        </div>
      </section>

      {flags.nfeAutomatica ? (
        <section aria-labelledby="nfe">
          <h2 id="nfe" className="mb-3 text-lg font-semibold text-marca-preto">Nota fiscal (Mainô)</h2>
          <PainelNfe
            pedidoId={p.id}
            status={p.status}
            mainoPedidoId={p.maino_pedido_id}
            nfeStatus={p.nfe_status}
            nfeErro={p.nfe_erro}
            danfeUrl={p.maino_nota_url}
            chave={p.maino_nota_id}
          />
        </section>
      ) : null}

      <section aria-labelledby="historico">
        <h2 id="historico" className="mb-2 text-lg font-semibold text-marca-preto">Histórico</h2>
        {p.eventos.length === 0 ? (
          <p className="text-sm text-marca-cinza-600">Nenhuma mudança de status ainda.</p>
        ) : (
          <ul data-testid="historico" className="space-y-1 text-sm text-marca-cinza-800">
            {p.eventos.map((e) => (
              <li key={e.id}>
                {dataHora.format(new Date(e.criado_em))} — {e.status_de ? STATUS_PEDIDO[e.status_de] : "—"} →{" "}
                {STATUS_PEDIDO[e.status_para]} por {e.admin_nome ?? "admin"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
