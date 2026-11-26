"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UploadCloudinary from "@/components/admin/UploadCloudinary";
import { salvarProduto, type ProdutoAdmin, type ResultadoAdmin } from "@/services/produtos-admin";

const campo =
  "w-full border border-marca-cinza-300 bg-marca-branco px-3 py-3 text-marca-preto outline-none focus:border-marca-preto";
const rotulo = "mb-1 block text-sm font-medium text-marca-cinza-800";
const botao =
  "bg-marca-preto px-6 py-3 font-semibold text-marca-branco transition-colors hover:bg-marca-cinza-800 disabled:cursor-not-allowed disabled:bg-marca-cinza-500";
const botaoSec =
  "border border-marca-preto px-3 py-2 text-sm font-medium text-marca-preto transition-colors hover:bg-marca-preto hover:text-marca-branco";

type Estado = ResultadoAdmin<{ id: string }> | null;

function Campo({
  id,
  label,
  defaultValue,
  required,
  inputMode,
}: {
  id: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={campo}
      />
    </div>
  );
}

function Area({ id, label, defaultValue }: { id: string; label: string; defaultValue?: string | null }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>
        {label}
      </label>
      <textarea id={id} name={id} rows={4} defaultValue={defaultValue ?? ""} className={campo} />
    </div>
  );
}

const decimal = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export default function FormProduto({ produto, locale }: { produto?: ProdutoAdmin; locale: string }) {
  const router = useRouter();
  const [estado, action, pendenteAcao] = useActionState<Estado, FormData>(salvarProduto, null);
  const [emTransicao, iniciar] = useTransition();
  const pendente = pendenteAcao || emTransicao;
  const [especificacoes, setEspecificacoes] = useState(produto?.especificacoes ?? []);
  const [imagens, setImagens] = useState(produto?.imagens ?? []);
  const [manual, setManual] = useState(produto?.manual_url ?? "");
  const [novaImagem, setNovaImagem] = useState("");

  // Produto recém-criado: vai para a edição (um novo envio recriaria o mesmo código).
  const criadoId = !produto && estado?.ok ? estado.dados.id : null;
  useEffect(() => {
    if (criadoId) router.replace(`/${locale}/admin/produtos/${criadoId}`);
  }, [criadoId, locale, router]);

  const alterarEsp = (i: number, parte: Partial<{ nome: string; valor: string }>) =>
    setEspecificacoes((l) => l.map((e, j) => (j === i ? { ...e, ...parte } : e)));

  return (
    <form
      onSubmit={(ev) => {
        // Sem action={...}: o React 19 limparia os campos quando a validação falha.
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        iniciar(() => action(dados));
      }}
      className="max-w-3xl space-y-5">
      <input type="hidden" name="id" value={produto?.id ?? ""} />
      <input type="hidden" name="especificacoes_json" value={JSON.stringify(especificacoes)} />
      <input type="hidden" name="imagens_json" value={JSON.stringify(imagens)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="codigo" label="Código" defaultValue={produto?.codigo} required />
        <Campo id="nome" label="Nome" defaultValue={produto?.nome} required />
        <Campo id="slug" label="Slug (URL)" defaultValue={produto?.slug} />
        <Campo id="preco" label="Preço de tabela (R$)" inputMode="decimal" defaultValue={decimal(produto?.preco ?? null)} />
        <Campo id="destaque" label="Destaque" defaultValue={produto?.destaque} />
        <Campo id="compatibilidade" label="Compatibilidade" defaultValue={produto?.compatibilidade} />
      </div>
      <label className="flex items-center gap-2 text-sm text-marca-preto">
        <input type="checkbox" name="ativo" defaultChecked={produto?.ativo ?? true} />
        Produto ativo (visível no catálogo)
      </label>

      <Area id="descricao" label="Descrição" defaultValue={produto?.descricao} />
      <Area id="aplicacoes" label="Aplicações" defaultValue={produto?.aplicacoes} />

      <h2 className="pt-2 text-lg font-bold text-marca-preto">Dados fiscais e logística</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Campo id="ncm" label="NCM" inputMode="numeric" defaultValue={produto?.ncm} />
        <Campo id="cest" label="CEST" inputMode="numeric" defaultValue={produto?.cest} />
        <Campo id="ean" label="EAN" inputMode="numeric" defaultValue={produto?.ean} />
        <Campo id="origem" label="Origem (0 a 8)" inputMode="numeric" defaultValue={produto?.origem} />
        <Campo id="unidade" label="Unidade" defaultValue={produto?.unidade ?? "UN"} />
        <Campo id="peso_kg" label="Peso (kg)" inputMode="decimal" defaultValue={decimal(produto?.peso_kg ?? null)} />
        <Campo id="altura_cm" label="Altura (cm)" inputMode="decimal" defaultValue={decimal(produto?.altura_cm ?? null)} />
        <Campo id="largura_cm" label="Largura (cm)" inputMode="decimal" defaultValue={decimal(produto?.largura_cm ?? null)} />
        <Campo id="comprimento_cm" label="Comprimento (cm)" inputMode="decimal" defaultValue={decimal(produto?.comprimento_cm ?? null)} />
      </div>

      <h2 className="pt-2 text-lg font-bold text-marca-preto">Especificações</h2>
      <div className="space-y-2">
        {especificacoes.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input
              aria-label={`Nome da especificação ${i + 1}`}
              value={e.nome}
              onChange={(ev) => alterarEsp(i, { nome: ev.target.value })}
              className={campo}
            />
            <input
              aria-label={`Valor da especificação ${i + 1}`}
              value={e.valor}
              onChange={(ev) => alterarEsp(i, { valor: ev.target.value })}
              className={campo}
            />
            <button
              type="button"
              onClick={() => setEspecificacoes((l) => l.filter((_, j) => j !== i))}
              className={botaoSec}
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEspecificacoes((l) => [...l, { nome: "", valor: "" }])}
          className={botaoSec}
        >
          Adicionar especificação
        </button>
      </div>

      <h2 className="pt-2 text-lg font-bold text-marca-preto">Imagens</h2>
      <div className="space-y-2">
        {imagens.map((im, i) => (
          <div key={`${im.url}-${i}`} className="flex gap-2">
            <input aria-label={`URL da imagem ${i + 1}`} value={im.url} readOnly className={campo} />
            <input
              aria-label={`Texto alternativo da imagem ${i + 1}`}
              value={im.alt}
              onChange={(ev) =>
                setImagens((l) => l.map((x, j) => (j === i ? { ...x, alt: ev.target.value } : x)))
              }
              className={campo}
            />
            <button
              type="button"
              onClick={() => setImagens((l) => l.filter((_, j) => j !== i))}
              className={botaoSec}
            >
              Remover
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            aria-label="URL da nova imagem"
            placeholder="https://…"
            value={novaImagem}
            onChange={(ev) => setNovaImagem(ev.target.value)}
            className={campo}
          />
          <button
            type="button"
            onClick={() => {
              if (!novaImagem.trim()) return;
              setImagens((l) => [...l, { url: novaImagem.trim(), alt: "" }]);
              setNovaImagem("");
            }}
            className={botaoSec}
          >
            Adicionar imagem
          </button>
        </div>
        <UploadCloudinary tipo="image" aoEnviar={(url) => setImagens((l) => [...l, { url, alt: "" }])} />
      </div>

      <h2 className="pt-2 text-lg font-bold text-marca-preto">Manual (PDF)</h2>
      <div className="space-y-2">
        <div>
          <label htmlFor="manual_url" className={rotulo}>
            URL do manual
          </label>
          <input
            id="manual_url"
            name="manual_url"
            type="text"
            placeholder="https://…"
            value={manual}
            onChange={(ev) => setManual(ev.target.value)}
            className={campo}
          />
        </div>
        <UploadCloudinary tipo="raw" aoEnviar={setManual} />
      </div>

      <p role="alert" className="min-h-5 text-sm text-marca-preto">
        {estado ? (estado.ok ? "Produto salvo." : estado.erro) : null}
      </p>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pendente} className={botao}>
          Salvar produto
        </button>
        <Link
          href={`/${locale}/admin/produtos`}
          className="text-sm text-marca-cinza-600 underline underline-offset-2 hover:text-marca-preto"
        >
          Voltar à lista
        </Link>
      </div>
    </form>
  );
}
