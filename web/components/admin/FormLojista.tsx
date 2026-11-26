"use client";

import { useRef } from "react";
import { useAcao, useTransicao } from "@/lib/react/destravar-transicao";
import { ArrowLeft, Building2, IdCard, MapPin, Save, UserPlus, UserRound } from "lucide-react";
import SenhaGerada from "@/components/admin/SenhaGerada";
import { AvisoAdmin, CampoAdmin, SeletorAdmin, soDigitos } from "@/components/admin/CamposAdmin";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { atualizarLojista, criarLojista } from "@/services/lojistas-admin";
import {
  PLACEHOLDER,
  mascaraCep,
  mascaraDocumento,
  mascaraPercentual,
  mascaraTelefone,
  tipoPorDocumento,
} from "@/lib/mascaras";

export type DadosEdicao = {
  id: string;
  tipo_pessoa: "PF" | "PJ";
  documento: string;
  nome: string;
  email: string;
  desconto_percentual: number;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  indicador_ie: "contribuinte" | "isento" | "nao_contribuinte";
  responsavel_nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

type Estado = ResultadoAdmin<{ id: string; senha: string }> | null;

const DIGITOS_NOVO = ["documento"];
const DIGITOS_EDICAO = ["telefone", "whatsapp", "cep"];

export function FormNovoLojista({ locale }: { locale: string }) {
  const [estado, action, pendenteAcao] = useAcao<Estado, FormData>(
    async (_anterior, form) => criarLojista(form),
    null,
  );
  const [emTransicao, iniciar] = useTransicao();
  const pendente = pendenteAcao || emTransicao;
  const tipo = useRef<HTMLSelectElement>(null);

  if (estado?.ok) {
    return (
      <CartaoConta titulo="Cliente cadastrado" idTitulo="cliente-cadastrado" icone={UserPlus}>
        <SenhaGerada senha={estado.dados.senha} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Botao href={`/${locale}/admin/lojistas/${estado.dados.id}`} icone={UserRound}>
            Ver cliente
          </Botao>
          <Botao href={`/${locale}/admin/lojistas`} variante="secundario" icone={ArrowLeft}>
            Voltar à lista
          </Botao>
        </div>
      </CartaoConta>
    );
  }

  return (
    <form
      onSubmit={(ev) => {
        // Sem action={...}: o React 19 limparia os campos quando o cadastro é recusado.
        ev.preventDefault();
        const dados = soDigitos(new FormData(ev.currentTarget), DIGITOS_NOVO);
        iniciar(() => action(dados));
      }}
      className="max-w-2xl space-y-6"
    >
      <CartaoConta titulo="Dados do cliente" idTitulo="dados-cliente" icone={IdCard}>
        {/* Coluna da esquerda mais larga: cabe o placeholder do CPF/CNPJ inteiro. */}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CampoAdmin
            id="documento"
            label="CPF/CNPJ"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder={PLACEHOLDER.documento}
            mascara={mascaraDocumento}
            aoMudar={(v) => {
              // O tipo segue o tamanho do documento; o admin ainda pode trocar.
              const t = tipoPorDocumento(v);
              if (t && tipo.current) tipo.current.value = t;
            }}
          />
          <SeletorAdmin ref={tipo} id="tipo_pessoa" label="Tipo de pessoa" defaultValue="PJ">
            <option value="PJ">Pessoa jurídica (CNPJ)</option>
            <option value="PF">Pessoa física (CPF)</option>
          </SeletorAdmin>
          <CampoAdmin id="nome" label="Nome ou razão social" required className="sm:col-span-2" />
          <CampoAdmin
            id="email"
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={PLACEHOLDER.email}
            required
          />
          <CampoAdmin
            id="desconto_percentual"
            label="Desconto (%)"
            inputMode="decimal"
            placeholder={PLACEHOLDER.desconto}
            mascara={mascaraPercentual}
            sufixo="%"
          />
        </div>
      </CartaoConta>

      <AvisoAdmin tipo="erro">{estado && !estado.ok ? estado.erro : null}</AvisoAdmin>
      <Botao type="submit" carregando={pendente} icone={UserPlus} className="px-6">
        Cadastrar cliente
      </Botao>
    </form>
  );
}

export function FormEditarLojista({ dados }: { dados: DadosEdicao }) {
  const [estado, action, pendenteAcao] = useAcao<ResultadoAdmin | null, FormData>(
    async (_anterior, form) => atualizarLojista(dados.id, form),
    null,
  );
  const [emTransicao, iniciar] = useTransicao();
  const pendente = pendenteAcao || emTransicao;

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const form = soDigitos(new FormData(ev.currentTarget), DIGITOS_EDICAO);
        iniciar(() => action(form));
      }}
      className="space-y-6"
    >
      <CartaoConta titulo="Dados cadastrais" idTitulo="dados-cadastrais" icone={Building2}>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAdmin
            id="tipo_pessoa"
            label="Tipo de pessoa"
            defaultValue={dados.tipo_pessoa === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
            somenteLeitura
          />
          <CampoAdmin id="documento" label="CPF/CNPJ" defaultValue={mascaraDocumento(dados.documento)} somenteLeitura />
          <CampoAdmin id="nome" label="Nome ou razão social" defaultValue={dados.nome} required />
          <CampoAdmin id="nome_fantasia" label="Nome fantasia" defaultValue={dados.nome_fantasia} />
          <CampoAdmin
            id="email"
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={PLACEHOLDER.email}
            defaultValue={dados.email}
            required
          />
          <CampoAdmin
            id="desconto_percentual"
            label="Desconto (%)"
            inputMode="decimal"
            placeholder={PLACEHOLDER.desconto}
            mascara={mascaraPercentual}
            sufixo="%"
            defaultValue={String(dados.desconto_percentual).replace(".", ",")}
          />
          <CampoAdmin id="responsavel_nome" label="Responsável" defaultValue={dados.responsavel_nome} />
          <CampoAdmin
            id="telefone"
            label="Telefone"
            type="tel"
            inputMode="tel"
            placeholder={PLACEHOLDER.telefone}
            mascara={mascaraTelefone}
            defaultValue={mascaraTelefone(dados.telefone)}
          />
          <CampoAdmin
            id="whatsapp"
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            placeholder={PLACEHOLDER.telefone}
            mascara={mascaraTelefone}
            defaultValue={mascaraTelefone(dados.whatsapp)}
          />
          <CampoAdmin
            id="inscricao_estadual"
            label="Inscrição estadual"
            placeholder={PLACEHOLDER.inscricaoEstadual}
            defaultValue={dados.inscricao_estadual}
          />
          <SeletorAdmin id="indicador_ie" label="Indicador de IE" defaultValue={dados.indicador_ie}>
            <option value="contribuinte">Contribuinte</option>
            <option value="isento">Isento</option>
            <option value="nao_contribuinte">Não contribuinte</option>
          </SeletorAdmin>
        </div>
      </CartaoConta>

      <CartaoConta titulo="Endereço" idTitulo="endereco" icone={MapPin}>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAdmin
            id="cep"
            label="CEP"
            inputMode="numeric"
            placeholder={PLACEHOLDER.cep}
            mascara={mascaraCep}
            defaultValue={mascaraCep(dados.cep)}
          />
          <CampoAdmin id="logradouro" label="Logradouro" defaultValue={dados.logradouro} />
          <CampoAdmin id="numero" label="Número" defaultValue={dados.numero} />
          <CampoAdmin id="complemento" label="Complemento" defaultValue={dados.complemento} />
          <CampoAdmin id="bairro" label="Bairro" defaultValue={dados.bairro} />
          <CampoAdmin id="cidade" label="Cidade" defaultValue={dados.cidade} />
          <CampoAdmin id="uf" label="UF" defaultValue={dados.uf} maxLength={2} />
        </div>
      </CartaoConta>

      <AvisoAdmin tipo={estado?.ok ? "ok" : "erro"}>
        {estado ? (estado.ok ? "Alterações salvas." : estado.erro) : null}
      </AvisoAdmin>
      <Botao type="submit" carregando={pendente} icone={Save} className="px-6">
        Salvar alterações
      </Botao>
    </form>
  );
}
