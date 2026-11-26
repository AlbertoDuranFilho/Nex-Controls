"use client";

import { useRef, useState } from "react";
import { useAcao } from "@/lib/react/destravar-transicao";
import { useTranslations } from "next-intl";
import { salvarEndereco, type EstadoForm } from "@/services/minha-conta";
import { buscarCep, normalizarCep } from "@/lib/validacao/cep";
import { UFS, ufValida } from "@/lib/conta/campos";
import { PLACEHOLDER, mascaraCep } from "@/lib/mascaras";
import { Save } from "lucide-react";
import { Campo, Retorno, Seletor } from "@/components/conta/Campo";
import Botao from "@/components/ui/Botao";

export type DadosEndereco = {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

const inicial: EstadoForm = { status: "idle" };

export default function FormEndereco({ locale, dados }: { locale: string; dados: DadosEndereco }) {
  const t = useTranslations("conta.endereco");
  const [estado, action, pendente] = useAcao(salvarEndereco, inicial);
  const [v, setV] = useState({
    cep: mascaraCep(dados.cep),
    logradouro: dados.logradouro ?? "",
    numero: dados.numero ?? "",
    complemento: dados.complemento ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.cidade ?? "",
    uf: dados.uf ?? "",
  });
  const [aviso, setAviso] = useState<"" | "naoEncontrado">("");
  const [buscando, setBuscando] = useState(false);
  const numeroRef = useRef<HTMLInputElement>(null);
  const consulta = useRef(0);
  const set = (campo: keyof typeof v) => (valor: string) => setV((a) => ({ ...a, [campo]: valor }));
  const erros = estado.erros ?? {};

  async function aoMudarCep(bruto: string) {
    const mascarado = mascaraCep(bruto);
    set("cep")(mascarado);
    const cep = normalizarCep(mascarado);
    const minha = ++consulta.current;
    if (!cep) {
      setAviso("");
      setBuscando(false);
      return;
    }
    setBuscando(true);
    // buscarCep nunca lança; falha, timeout e CEP inexistente viram null e nunca bloqueiam o salvar.
    const endereco = await buscarCep(cep);
    if (minha !== consulta.current) return;
    setBuscando(false);
    if (!endereco) {
      setAviso("naoEncontrado");
      return;
    }
    setAviso("");
    setV((a) => ({
      ...a,
      logradouro: endereco.logradouro || a.logradouro,
      bairro: endereco.bairro || a.bairro,
      cidade: endereco.cidade || a.cidade,
      uf: ufValida(endereco.uf) ? endereco.uf : a.uf,
    }));
    numeroRef.current?.focus();
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 sm:max-w-xs">
          <Campo
            id="cep"
            label={t("cep")}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={PLACEHOLDER.cep}
            value={v.cep}
            mascara={mascaraCep}
            onChange={aoMudarCep}
            required
            erro={erros.cep}
          />
          <p aria-live="polite" className="mt-1 min-h-5 text-sm text-marca-cinza-600">
            {buscando ? t("buscando") : aviso === "naoEncontrado" ? t("naoEncontrado") : ""}
          </p>
        </div>
        <div className="sm:col-span-2">
          <Campo
            id="logradouro"
            label={t("logradouro")}
            autoComplete="address-line1"
            value={v.logradouro}
            onChange={set("logradouro")}
            required
            maxLength={150}
            erro={erros.logradouro}
          />
        </div>
        <Campo
          id="numero"
          label={t("numero")}
          inputRef={numeroRef}
          autoComplete="address-line2"
          value={v.numero}
          onChange={set("numero")}
          required
          maxLength={20}
          erro={erros.numero}
        />
        <Campo
          id="complemento"
          label={t("complemento")}
          autoComplete="address-line3"
          value={v.complemento}
          onChange={set("complemento")}
          maxLength={80}
          erro={erros.complemento}
        />
        <Campo
          id="bairro"
          label={t("bairro")}
          autoComplete="address-level3"
          value={v.bairro}
          onChange={set("bairro")}
          required
          maxLength={80}
          erro={erros.bairro}
        />
        <Campo
          id="cidade"
          label={t("cidade")}
          autoComplete="address-level2"
          value={v.cidade}
          onChange={set("cidade")}
          required
          maxLength={80}
          erro={erros.cidade}
        />
        <Seletor
          id="uf"
          label={t("uf")}
          autoComplete="address-level1"
          value={v.uf}
          onChange={set("uf")}
          required
          erro={erros.uf}
        >
          <option value="" />
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Seletor>
      </div>

      <Retorno estado={estado} pendente={pendente} />
      <Botao type="submit" carregando={pendente} icone={Save} className="px-6">
        {t("salvar")}
      </Botao>
    </form>
  );
}
