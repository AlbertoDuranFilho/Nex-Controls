"use client";

import { useEffect, useState } from "react";
import { useAcao, useTransicao } from "@/lib/react/destravar-transicao";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, ImagePlus, Images, ListChecks, Package, Plus, Save, Trash2, Truck } from "lucide-react";
import { AreaAdmin, AvisoAdmin, CaixaSelecao, CampoAdmin, semVirgulaPendurada } from "@/components/admin/CamposAdmin";
import UploadCloudinary from "@/components/admin/UploadCloudinary";
import { estiloCampo, estiloRotulo } from "@/components/conta/Campo";
import CartaoConta from "@/components/conta/CartaoConta";
import Botao from "@/components/ui/Botao";
import { PLACEHOLDER, mascaraDecimal } from "@/lib/mascaras";
import type { ResultadoAdmin } from "@/lib/admin/resultado";
import { salvarProduto, type ProdutoAdmin } from "@/services/produtos-admin";

type Estado = ResultadoAdmin<{ id: string }> | null;

const decimal = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export default function FormProduto({ produto, locale }: { produto?: ProdutoAdmin; locale: string }) {
  const router = useRouter();
  const [estado, action, pendenteAcao] = useAcao<Estado, FormData>(salvarProduto, null);
  const [emTransicao, iniciar] = useTransicao();
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
        const dados = semVirgulaPendurada(new FormData(ev.currentTarget), ["preco"]);
        iniciar(() => action(dados));
      }}
      method="post"
      className="max-w-4xl space-y-6">
      <input type="hidden" name="id" value={produto?.id ?? ""} />
      <input type="hidden" name="especificacoes_json" value={JSON.stringify(especificacoes)} />
      <input type="hidden" name="imagens_json" value={JSON.stringify(imagens)} />

      <CartaoConta titulo="Dados do produto" idTitulo="dados-produto" icone={Package}>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoAdmin id="codigo" label="Código" defaultValue={produto?.codigo} required />
          <CampoAdmin id="nome" label="Nome" defaultValue={produto?.nome} required />
          <CampoAdmin id="slug" label="Slug (URL)" defaultValue={produto?.slug} placeholder="gerado automaticamente" />
          <CampoAdmin
            id="preco"
            label="Preço de tabela (R$)"
            inputMode="decimal"
            placeholder={PLACEHOLDER.preco}
            mascara={mascaraDecimal}
            defaultValue={decimal(produto?.preco ?? null)}
          />
          <CampoAdmin id="destaque" label="Destaque" defaultValue={produto?.destaque} />
          <CampoAdmin id="compatibilidade" label="Compatibilidade" defaultValue={produto?.compatibilidade} />
          <AreaAdmin id="descricao" label="Descrição" defaultValue={produto?.descricao} className="sm:col-span-2" />
          <AreaAdmin id="aplicacoes" label="Aplicações" defaultValue={produto?.aplicacoes} className="sm:col-span-2" />
        </div>
        <div className="mt-5">
          <CaixaSelecao name="ativo" defaultChecked={produto?.ativo ?? true}>
            Produto ativo (visível no catálogo)
          </CaixaSelecao>
        </div>
      </CartaoConta>

      <CartaoConta titulo="Dados fiscais e logística" idTitulo="fiscais" icone={Truck}>
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoAdmin id="ncm" label="NCM" inputMode="numeric" placeholder="00000000" defaultValue={produto?.ncm} />
          <CampoAdmin id="cest" label="CEST" inputMode="numeric" placeholder="0000000" defaultValue={produto?.cest} />
          <CampoAdmin id="ean" label="EAN" inputMode="numeric" defaultValue={produto?.ean} />
          <CampoAdmin id="origem" label="Origem (0 a 8)" inputMode="numeric" placeholder="0" defaultValue={produto?.origem} />
          <CampoAdmin id="unidade" label="Unidade" defaultValue={produto?.unidade ?? "UN"} />
          <CampoAdmin id="peso_kg" label="Peso (kg)" inputMode="decimal" placeholder="0,000" defaultValue={decimal(produto?.peso_kg ?? null)} />
          <CampoAdmin id="altura_cm" label="Altura (cm)" inputMode="decimal" placeholder="0,0" defaultValue={decimal(produto?.altura_cm ?? null)} />
          <CampoAdmin id="largura_cm" label="Largura (cm)" inputMode="decimal" placeholder="0,0" defaultValue={decimal(produto?.largura_cm ?? null)} />
          <CampoAdmin
            id="comprimento_cm"
            label="Comprimento (cm)"
            inputMode="decimal"
            placeholder="0,0"
            defaultValue={decimal(produto?.comprimento_cm ?? null)}
          />
        </div>
      </CartaoConta>

      <CartaoConta titulo="Especificações" idTitulo="especificacoes" icone={ListChecks}>
        <div className="space-y-3">
          {especificacoes.map((e, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                aria-label={`Nome da especificação ${i + 1}`}
                placeholder="Nome (ex.: Tensão)"
                value={e.nome}
                onChange={(ev) => alterarEsp(i, { nome: ev.target.value })}
                className={estiloCampo}
              />
              <input
                aria-label={`Valor da especificação ${i + 1}`}
                placeholder="Valor (ex.: 24 V)"
                value={e.valor}
                onChange={(ev) => alterarEsp(i, { valor: ev.target.value })}
                className={estiloCampo}
              />
              <Botao
                variante="fantasma"
                icone={Trash2}
                className="min-h-12"
                onClick={() => setEspecificacoes((l) => l.filter((_, j) => j !== i))}
              >
                Remover
              </Botao>
            </div>
          ))}
          <Botao
            variante="secundario"
            icone={Plus}
            onClick={() => setEspecificacoes((l) => [...l, { nome: "", valor: "" }])}
          >
            Adicionar especificação
          </Botao>
        </div>
      </CartaoConta>

      <CartaoConta titulo="Imagens" idTitulo="imagens" icone={Images}>
        <div className="space-y-3">
          {imagens.map((im, i) => (
            <div key={`${im.url}-${i}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                aria-label={`URL da imagem ${i + 1}`}
                value={im.url}
                readOnly
                className={`${estiloCampo} text-marca-cinza-600`}
              />
              <input
                aria-label={`Texto alternativo da imagem ${i + 1}`}
                placeholder="Texto alternativo"
                value={im.alt}
                onChange={(ev) =>
                  setImagens((l) => l.map((x, j) => (j === i ? { ...x, alt: ev.target.value } : x)))
                }
                className={estiloCampo}
              />
              <Botao
                variante="fantasma"
                icone={Trash2}
                className="min-h-12"
                onClick={() => setImagens((l) => l.filter((_, j) => j !== i))}
              >
                Remover
              </Botao>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              aria-label="URL da nova imagem"
              inputMode="url"
              placeholder="https://…"
              value={novaImagem}
              onChange={(ev) => setNovaImagem(ev.target.value)}
              className={estiloCampo}
            />
            <Botao
              variante="secundario"
              icone={ImagePlus}
              className="min-h-12"
              onClick={() => {
                if (!novaImagem.trim()) return;
                setImagens((l) => [...l, { url: novaImagem.trim(), alt: "" }]);
                setNovaImagem("");
              }}
            >
              Adicionar imagem
            </Botao>
          </div>
          <UploadCloudinary tipo="image" aoEnviar={(url) => setImagens((l) => [...l, { url, alt: "" }])} />
        </div>
      </CartaoConta>

      <CartaoConta titulo="Manual (PDF)" idTitulo="manual" icone={FileText}>
        <div className="space-y-3">
          <div>
            <label htmlFor="manual_url" className={estiloRotulo}>
              URL do manual
            </label>
            <input
              id="manual_url"
              name="manual_url"
              type="text"
              inputMode="url"
              placeholder="https://…"
              value={manual}
              onChange={(ev) => setManual(ev.target.value)}
              className={estiloCampo}
            />
          </div>
          <UploadCloudinary tipo="raw" aoEnviar={setManual} />
        </div>
      </CartaoConta>

      <AvisoAdmin tipo={estado?.ok ? "ok" : "erro"} papel={estado?.ok ? "status" : "alert"}>
        {estado ? (estado.ok ? "Produto salvo." : estado.erro) : null}
      </AvisoAdmin>
      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" carregando={pendente} icone={Save} className="px-6">
          Salvar produto
        </Botao>
        <Botao href={`/${locale}/admin/produtos`} variante="fantasma" icone={ArrowLeft}>
          Voltar para produtos
        </Botao>
      </div>
    </form>
  );
}
