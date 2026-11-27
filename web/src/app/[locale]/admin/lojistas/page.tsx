import { Pencil, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import BuscaAdmin from "@/components/admin/BuscaAdmin";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { CelulaAdmin, LinhaAdmin, TabelaAdmin, VazioAdmin } from "@/components/admin/TabelaAdmin";
import Botao from "@/components/ui/Botao";
import Selo from "@/components/ui/Selo";
import { ehAdmin } from "@/lib/auth/exigir-admin";
import { listarLojistas } from "@/services/lojistas-admin";
import { mascaraDocumento } from "@/lib/mascaras";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ busca?: string | string[] }>;
};

export default async function ListaLojistasPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { busca } = await searchParams;
  // Página e layout renderizam em paralelo: confere aqui para não buscar dados nem lançar erro.
  if (!(await ehAdmin())) redirect(`/${locale}`);
  const termo = typeof busca === "string" ? busca : "";
  const lojistas = await listarLojistas(termo);

  return (
    <div>
      <CabecalhoAdmin titulo="Clientes" descricao="Lojistas com acesso à loja.">
        <Botao href={`/${locale}/admin/lojistas/novo`} icone={Plus}>
          Novo cliente
        </Botao>
      </CabecalhoAdmin>

      <BuscaAdmin termo={termo} placeholder="Nome, nome fantasia ou CPF/CNPJ" />

      {lojistas.length === 0 ? (
        <VazioAdmin icone={Users}>Nenhum cliente encontrado.</VazioAdmin>
      ) : (
        <TabelaAdmin
          colunas={["Nome", "CPF/CNPJ", "E-mail", "Status", <span key="a" className="sr-only">Ações</span>]}
        >
          {lojistas.map((l) => (
            <LinhaAdmin key={l.id}>
              <CelulaAdmin className="font-medium text-marca-preto">
                <span className="min-w-0 break-words">{l.nome}</span>
              </CelulaAdmin>
              <CelulaAdmin rotulo="CPF/CNPJ" className="whitespace-nowrap text-marca-cinza-800">
                {l.documento ? mascaraDocumento(l.documento) : "—"}
              </CelulaAdmin>
              <CelulaAdmin rotulo="E-mail" className="text-marca-cinza-800">
                <span className="break-all">{l.email}</span>
              </CelulaAdmin>
              <CelulaAdmin rotulo="Status">
                <Selo tom={!l.anonimizado && l.ativo ? "verde" : "neutro"}>
                  {l.anonimizado ? "Anonimizado" : l.ativo ? "Ativo" : "Inativo"}
                </Selo>
              </CelulaAdmin>
              <CelulaAdmin alinhar="direita" className="justify-end">
                <Botao href={`/${locale}/admin/lojistas/${l.id}`} variante="fantasma" tamanho="sm" icone={Pencil}>
                  Editar
                </Botao>
              </CelulaAdmin>
            </LinhaAdmin>
          ))}
        </TabelaAdmin>
      )}
    </div>
  );
}
