import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  MapPin,
  MessageCircle,
  ShieldCheck,
  User,
  UserX,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExigeLogin } from "@/components/ExigeLogin";
import { Botao } from "@/components/ui/Botao";
import { Faixa } from "@/components/ui/Faixa";
import { Selo } from "@/components/ui/Selo";
import { CAMINHO_AREA_CLIENTE, CAMINHO_POLITICA, contato } from "@/constants/contato";
import { ALVO_MINIMO, cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import {
  buscarMeuCadastro,
  formatarDocumento,
  formatarTelefone,
  linhasEndereco,
  rotuloIndicadorIe,
} from "@/lib/conta";
import type { MeuCadastro } from "@/lib/conta";
import { abrirContato, abrirEmail, abrirPaginaDoSite, abrirWhatsApp, temWhatsApp } from "@/lib/contato";
import { useSessao } from "@/lib/sessao";

const t = textos.conta;

type Carga = { usuarioId: string; cadastro: MeuCadastro | null } | "erro" | null;

// Conta do lojista: dados e endereço (leitura; edição no site), contato, privacidade,
// pedido de exclusão (exigência da Google Play) e sair.
function ConteudoConta() {
  const { email, usuarioId, lojistaAtivo, sair } = useSessao();
  const [carga, setCarga] = useState<Carga>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const carregar = useCallback(() => {
    if (!usuarioId) return;
    void buscarMeuCadastro(usuarioId).then(
      (cadastro) => {
        if (vivo.current) setCarga({ usuarioId, cadastro });
      },
      () => {
        if (vivo.current) setCarga((c) => (c && c !== "erro" && c.usuarioId === usuarioId ? c : "erro"));
      },
    );
  }, [usuarioId]);

  // relê ao abrir a aba (o cliente pode ter mudado os dados no site)
  useFocusEffect(carregar);

  const cadastro = carga && carga !== "erro" && carga.usuarioId === usuarioId ? carga.cadastro : null;
  const emailConta = email ?? cadastro?.email ?? "";
  const endereco = cadastro ? linhasEndereco(cadastro) : null;

  function faleConosco() {
    const mensagem = { assunto: textos.contato.assuntoGeral, texto: textos.contato.mensagemGeral };
    if (!temWhatsApp()) {
      void abrirEmail(mensagem);
      return;
    }
    Alert.alert(t.faleConosco, undefined, [
      { text: t.whatsappOpcao, onPress: () => void abrirWhatsApp(mensagem) },
      { text: t.emailOpcao(contato.email), onPress: () => void abrirEmail(mensagem) },
      { text: t.cancelar, style: "cancel" },
    ]);
  }

  function excluirConta() {
    Alert.alert(t.excluirTitulo, t.excluirMensagem, [
      { text: t.cancelar, style: "cancel" },
      {
        text: t.excluirContinuar,
        style: "destructive",
        onPress: () =>
          void abrirContato({
            assunto: textos.contato.assuntoExclusao,
            texto: textos.contato.mensagemExclusao(emailConta),
          }),
      },
    ]);
  }

  const dados: [string, string | null][] = cadastro
    ? [
        [t.nome, cadastro.nome],
        [t.documento, formatarDocumento(cadastro.documento)],
        [t.nomeFantasia, cadastro.nome_fantasia],
        [t.responsavel, cadastro.responsavel_nome],
        [t.telefone, formatarTelefone(cadastro.telefone)],
        [t.whatsapp, formatarTelefone(cadastro.whatsapp)],
        [t.indicadorIe, rotuloIndicadorIe(cadastro.indicador_ie)],
        [t.inscricaoEstadual, cadastro.inscricao_estadual],
      ]
    : [];
  const versao = Constants.expoConfig?.version;

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo} testID="tela-conta">
      <View style={estilos.perfil}>
        <View style={estilos.avatar}>
          <User size={26} color={cores.branco} strokeWidth={1.8} />
        </View>
        <View style={estilos.info}>
          <Text style={estilos.nome} numberOfLines={2} testID="conta-nome">
            {cadastro?.nome_fantasia || cadastro?.nome || t.conectadoComo}
          </Text>
          <Text style={estilos.email} numberOfLines={1}>
            {emailConta}
          </Text>
          {!lojistaAtivo ? (
            <Selo texto={textos.sessao.cadastroInativoTitulo} variante="aviso" style={estilos.selo} />
          ) : null}
        </View>
      </View>

      {carga === "erro" ? (
        <Faixa
          icone={WifiOff}
          texto={t.erroDados}
          acao={{ titulo: textos.sessao.tentarDeNovo, onPress: carregar }}
          testID="conta-erro"
        />
      ) : null}

      {cadastro ? (
        <>
          <Secao titulo={t.meusDados}>
            <View style={estilos.cartao} testID="meus-dados">
              {dados
                .filter(([, v]) => v)
                .map(([rotulo, valor], i) => (
                  <View key={rotulo} style={[estilos.dado, i > 0 && estilos.dadoSeparado]} accessible>
                    <Text style={estilos.dadoRotulo}>{rotulo}</Text>
                    <Text style={estilos.dadoValor}>{valor}</Text>
                  </View>
                ))}
            </View>
          </Secao>

          <Secao titulo={t.endereco}>
            <View style={[estilos.cartao, estilos.endereco]} testID="endereco">
              <MapPin size={18} color={cores.preto} strokeWidth={1.9} />
              <View style={estilos.enderecoTextos}>
                {endereco ? (
                  endereco.map((l) => (
                    <Text key={l} style={estilos.enderecoLinha}>
                      {l}
                    </Text>
                  ))
                ) : (
                  <Text style={estilos.enderecoVazio}>{t.semEndereco}</Text>
                )}
              </View>
            </View>
            <Text style={estilos.nota}>{t.editarNoSite}</Text>
            <Botao
              titulo={t.abrirSite}
              icone={ExternalLink}
              variante="secundario"
              tamanho="compacto"
              onPress={() => void abrirPaginaDoSite(CAMINHO_AREA_CLIENTE)}
              testID="abrir-area-cliente"
            />
          </Secao>
        </>
      ) : null}

      <Secao titulo={t.ajuda}>
        <View style={[estilos.cartao, estilos.lista]}>
          <ItemMenu
            icone={MessageCircle}
            titulo={t.faleConosco}
            descricao={t.faleConoscoDescricao}
            onPress={faleConosco}
            testID="fale-conosco"
          />
          <ItemMenu
            icone={ShieldCheck}
            titulo={t.politica}
            onPress={() => void abrirPaginaDoSite(CAMINHO_POLITICA)}
            separado
            testID="politica"
          />
          <ItemMenu
            icone={UserX}
            titulo={t.excluirConta}
            descricao={t.excluirDescricao}
            onPress={excluirConta}
            separado
            perigo
            testID="excluir-conta"
          />
        </View>
      </Secao>

      <Botao titulo={textos.sessao.sair} icone={LogOut} variante="contorno" onPress={() => void sair()} testID="sair" />
      {versao ? <Text style={estilos.versao}>{t.versao(versao)}</Text> : null}
    </ScrollView>
  );
}

export default function TelaConta() {
  return (
    <ExigeLogin>
      <ConteudoConta />
    </ExigeLogin>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.secaoTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function ItemMenu({
  icone: Icone,
  titulo,
  descricao,
  onPress,
  separado = false,
  perigo = false,
  testID,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  onPress: () => void;
  separado?: boolean;
  perigo?: boolean;
  testID?: string;
}) {
  const cor = perigo ? cores.erro : cores.preto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descricao ? `${titulo}. ${descricao}` : titulo}
      style={({ pressed }) => [estilos.item, separado && estilos.itemSeparado, pressed && estilos.pressionado]}
      testID={testID}
    >
      <View style={[estilos.itemIcone, perigo && estilos.itemIconePerigo]}>
        <Icone size={19} color={cor} strokeWidth={1.9} />
      </View>
      <View style={estilos.itemTextos}>
        <Text style={[estilos.itemTitulo, perigo && { color: cores.erro }]}>{titulo}</Text>
        {descricao ? <Text style={estilos.itemDescricao}>{descricao}</Text> : null}
      </View>
      <ChevronRight size={18} color={cores.cinza400} strokeWidth={2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espacos.lg, gap: espacos.lg, paddingBottom: espacos.xxxl },
  perfil: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.lg,
    padding: espacos.lg,
    backgroundColor: cores.preto,
    borderRadius: raios.cartao,
    ...sombras.cartao,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: raios.pill,
    backgroundColor: cores.cinza800,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  nome: { fontSize: fontes.tamanho.destaque, fontWeight: fontes.peso.negrito, color: cores.branco },
  email: { fontSize: fontes.tamanho.pequeno, color: cores.cinza300 },
  selo: { marginTop: espacos.xs },
  secao: { gap: espacos.sm + 2 },
  secaoTitulo: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.2,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    paddingHorizontal: espacos.lg,
    paddingVertical: espacos.xs,
    ...sombras.cartao,
  },
  dado: { paddingVertical: espacos.md, gap: 2 },
  dadoSeparado: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda },
  dadoRotulo: { fontSize: fontes.tamanho.legenda, color: cores.textoFraco },
  dadoValor: { fontSize: fontes.tamanho.corpo, color: cores.texto, fontWeight: fontes.peso.medio },
  endereco: { flexDirection: "row", gap: espacos.md, paddingVertical: espacos.lg, alignItems: "flex-start" },
  enderecoTextos: { flex: 1, gap: 2 },
  enderecoLinha: { fontSize: fontes.tamanho.corpo - 1, color: cores.cinza800, lineHeight: 21 },
  enderecoVazio: { fontSize: fontes.tamanho.corpo - 1, color: cores.textoSuave },
  nota: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco, lineHeight: 18 },
  lista: { paddingVertical: 0 },
  item: { flexDirection: "row", alignItems: "center", gap: espacos.md, minHeight: ALVO_MINIMO + 16, paddingVertical: espacos.sm },
  itemSeparado: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda },
  pressionado: { opacity: 0.6 },
  itemIcone: {
    width: 36,
    height: 36,
    borderRadius: raios.pequeno + 2,
    backgroundColor: cores.cinza100,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconePerigo: { backgroundColor: cores.erroFundo },
  itemTextos: { flex: 1, gap: 1 },
  itemTitulo: { fontSize: fontes.tamanho.corpo, fontWeight: fontes.peso.semibold, color: cores.texto },
  itemDescricao: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
  versao: { fontSize: fontes.tamanho.legenda, color: cores.textoFraco, textAlign: "center" },
});
