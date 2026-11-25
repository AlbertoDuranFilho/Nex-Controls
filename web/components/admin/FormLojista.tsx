"use client";

import { useActionState } from "react";
import Link from "next/link";
import SenhaGerada from "@/components/admin/SenhaGerada";
import {
  atualizarLojista,
  criarLojista,
  type ResultadoAdmin,
} from "@/services/lojistas-admin";
import { formatarDocumento } from "@/lib/validacao/documento";

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

const campo =
  "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto disabled:bg-marca-cinza-100 disabled:text-marca-cinza-600";
const rotulo = "mb-1 block text-sm font-medium text-marca-cinza-800";
const botao =
  "bg-marca-preto px-6 py-3 font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500";

type Estado = ResultadoAdmin<{ id: string; senha: string }> | null;

function Campo({
  id,
  label,
  defaultValue,
  required,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel" | "decimal";
}) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={campo}
      />
    </div>
  );
}

export function FormNovoLojista({ locale }: { locale: string }) {
  const [estado, action, pendente] = useActionState<Estado, FormData>(
    async (_anterior, form) => criarLojista(form),
    null,
  );

  if (estado?.ok) {
    return (
      <div className="space-y-5">
        <p className="text-marca-preto">Cliente cadastrado.</p>
        <SenhaGerada senha={estado.dados.senha} />
        <div className="flex gap-4 text-sm">
          <Link
            href={`/${locale}/admin/lojistas/${estado.dados.id}`}
            className="font-medium text-marca-preto underline underline-offset-2"
          >
            Ver cliente
          </Link>
          <Link
            href={`/${locale}/admin/lojistas`}
            className="text-marca-cinza-600 underline underline-offset-2 hover:text-marca-preto"
          >
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label htmlFor="tipo_pessoa" className={rotulo}>
          Tipo de pessoa
        </label>
        <select id="tipo_pessoa" name="tipo_pessoa" defaultValue="PJ" className={campo}>
          <option value="PJ">Pessoa jurídica (CNPJ)</option>
          <option value="PF">Pessoa física (CPF)</option>
        </select>
      </div>
      <Campo id="documento" label="CPF/CNPJ" required inputMode="numeric" />
      <Campo id="nome" label="Nome ou razão social" required />
      <Campo id="email" label="E-mail" type="email" required />
      <Campo id="desconto_percentual" label="Desconto (%)" inputMode="decimal" />

      <p role="alert" className="min-h-5 text-sm text-marca-preto">
        {estado && !estado.ok ? estado.erro : null}
      </p>
      <button type="submit" disabled={pendente} className={botao}>
        Cadastrar cliente
      </button>
    </form>
  );
}

export function FormEditarLojista({ dados }: { dados: DadosEdicao }) {
  const [estado, action, pendente] = useActionState<ResultadoAdmin | null, FormData>(
    async (_anterior, form) => atualizarLojista(dados.id, form),
    null,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo_pessoa" className={rotulo}>
            Tipo de pessoa
          </label>
          <input
            id="tipo_pessoa"
            value={dados.tipo_pessoa === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
            disabled
            readOnly
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="documento" className={rotulo}>
            CPF/CNPJ
          </label>
          <input
            id="documento"
            value={formatarDocumento(dados.documento)}
            disabled
            readOnly
            className={campo}
          />
        </div>
        <Campo id="nome" label="Nome ou razão social" defaultValue={dados.nome} required />
        <Campo id="nome_fantasia" label="Nome fantasia" defaultValue={dados.nome_fantasia} />
        <Campo id="email" label="E-mail" type="email" defaultValue={dados.email} required />
        <Campo
          id="desconto_percentual"
          label="Desconto (%)"
          inputMode="decimal"
          defaultValue={String(dados.desconto_percentual).replace(".", ",")}
        />
        <Campo id="responsavel_nome" label="Responsável" defaultValue={dados.responsavel_nome} />
        <Campo id="telefone" label="Telefone" inputMode="tel" defaultValue={dados.telefone} />
        <Campo id="whatsapp" label="WhatsApp" inputMode="tel" defaultValue={dados.whatsapp} />
        <Campo
          id="inscricao_estadual"
          label="Inscrição estadual"
          defaultValue={dados.inscricao_estadual}
        />
        <div>
          <label htmlFor="indicador_ie" className={rotulo}>
            Indicador de IE
          </label>
          <select
            id="indicador_ie"
            name="indicador_ie"
            defaultValue={dados.indicador_ie}
            className={campo}
          >
            <option value="contribuinte">Contribuinte</option>
            <option value="isento">Isento</option>
            <option value="nao_contribuinte">Não contribuinte</option>
          </select>
        </div>
      </div>

      <h2 className="pt-2 text-lg font-bold text-marca-preto">Endereço</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="cep" label="CEP" inputMode="numeric" defaultValue={dados.cep} />
        <Campo id="logradouro" label="Logradouro" defaultValue={dados.logradouro} />
        <Campo id="numero" label="Número" defaultValue={dados.numero} />
        <Campo id="complemento" label="Complemento" defaultValue={dados.complemento} />
        <Campo id="bairro" label="Bairro" defaultValue={dados.bairro} />
        <Campo id="cidade" label="Cidade" defaultValue={dados.cidade} />
        <Campo id="uf" label="UF" defaultValue={dados.uf} />
      </div>

      <p role="alert" className="min-h-5 text-sm text-marca-preto">
        {estado ? (estado.ok ? "Alterações salvas." : estado.erro) : null}
      </p>
      <button type="submit" disabled={pendente} className={botao}>
        Salvar alterações
      </button>
    </form>
  );
}
