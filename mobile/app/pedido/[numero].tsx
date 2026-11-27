import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CircleCheck, FileText, MapPin, PackageSearch, RefreshCw, StickyNote, WifiOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvisoCentral, Carregando, ExigeLogin } from "@/components/ExigeLogin";
import { StatusPedido } from "@/components/StatusPedido";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import {
  CORES_TOM,
  formatarDataHora,
  lerNumeroPedido,
  linkNotaFiscal,
  obterMeuPedido,
  rotuloStatus,
  visualStatus,
} from "@/lib/pedidos";
import type { PedidoDetalhe, PedidoStatus } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

const t = textos.pedidos;

export default function TelaPedido() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const n = lerNumeroPedido(numero);
  return (
    <>
      <Stack.Screen options={{ title: n ? t.numero(n) : t.titulo }} />
      <ExigeLogin>
        <DetalhePedido numero={n} />
      </ExigeLogin>
    </>
  );
}

type Carga = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "pronto"; pedido: PedidoDetalhe | null };

function DetalhePedido({ numero }: { numero: number | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { novo } = useLocalSearchParams<{ novo?: string }>();
  const { usuarioId } = useSessao();
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });
  const [atualizando, setAtualizando] = useState(false);
  const vivo = useRef(true);

  const carregar = useCallback(() => {
    const busca = numero && usuarioId ? obterMeuPedido(usuarioId, numero) : Promise.resolve(null);
    return busca.then(
      (pedido) => {
        if (vivo.current) setCarga({ tipo: "pronto", pedido });
      },
      () => {
        if (vivo.current) setCarga((c) => (c.tipo === "pronto" && c.pedido ? c : { tipo: "erro" }));
      },
    );
  }, [numero, usuarioId]);

  useEffect(() => {
    vivo.current = true;
    void carregar();
    return () => {
      vivo.current = false;
    };
  }, [carregar]);

  async function atualizar() {
    setAtualizando(true);
    await carregar();
    if (vivo.current) setAtualizando(false);
  }

  if (carga.tipo === "carregando") return <Carregando />;
  if (carga.tipo === "erro") {
    return (
      <AvisoCentral
        icone={WifiOff}
        titulo={t.erroCarregarTitulo}
        descricao={t.erroCarregar}
        acao={{
          titulo: textos.geral.tentarNovamente,
          icone: RefreshCw,
          onPress: () => {
            setCarga({ tipo: "carregando" });
            void carregar();
          },
        }}
        testID="pedido-erro"
      />
    );
  }
  const pedido = carga.pedido;
  if (!pedido) {
    return (
      <AvisoCentral
        icone={PackageSearch}
        titulo={t.naoEncontrado}
        descricao={t.naoEncontradoDescricao}
        acao={{ titulo: t.voltar, onPress: () => router.navigate("/pedidos") }}
        testID="pedido-nao-encontrado"
      />
    );
  }

  const nota = linkNotaFiscal(pedido);
  const rotuloDesconto = pedido.desconto_origem === "cupom" ? t.cupom : t.descontoCliente;

  async function abrirNota(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(t.erroNota);
    }
  }

  return (
    <ScrollView
      style={estilos.tela}
      contentContainerStyle={[estilos.conteudo, { paddingBottom: insets.bottom + espacos.xxl }]}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void atualizar()}
          colors={[cores.preto]}
          tintColor={cores.preto}
        />
      }
      testID="tela-pedido"
    >
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo} accessibilityRole="header">
          {t.numero(pedido.numero)}
        </Text>
        <StatusPedido status={pedido.status} testID="status-pedido" />
        <Text style={estilos.data}>{formatarDataHora(pedido.created_at)}</Text>
      </View>

      {novo === "1" ? (
        <View style={estilos.confirmacao} accessibilityLiveRegion="polite" testID="confirmacao">
          <CircleCheck size={18} color={cores.branco} strokeWidth={2} />
          <Text style={estilos.confirmacaoTexto}>{t.confirmacao}</Text>
        </View>
      ) : null}

      <Secao titulo={t.itens}>
        <View style={estilos.cartao}>
          {pedido.itens.map((i, idx) => (
            <View key={`${i.codigo}-${idx}`} style={[estilos.item, idx > 0 && estilos.itemSeparado]} testID="item-pedido">
              <View style={estilos.itemTextos}>
                <Selo texto={i.codigo} formato="etiqueta" variante="escuro" />
                <Text style={estilos.itemNome} numberOfLines={3}>
                  {i.nome}
                </Text>
                <Text style={estilos.itemDetalhe}>{t.quantidadeVezes(i.quantidade, formatarMoeda(i.preco_unitario))}</Text>
              </View>
              <Text style={estilos.itemTotal}>{formatarMoeda(i.total_linha)}</Text>
            </View>
          ))}
        </View>
      </Secao>

      <View style={[estilos.cartao, estilos.totais]} testID="totais">
        <Linha rotulo={t.subtotal} valor={formatarMoeda(pedido.subtotal)} />
        {pedido.desconto_valor > 0 ? (
          <Linha rotulo={rotuloDesconto} valor={`−${formatarMoeda(pedido.desconto_valor)}`} />
        ) : null}
        <Linha
          rotulo={t.frete}
          valor={pedido.frete_valor > 0 ? formatarMoeda(pedido.frete_valor) : t.freteACombinar}
        />
        <View style={estilos.linhaTotal} accessible accessibilityLabel={`${t.total}: ${formatarMoeda(pedido.total)}`}>
          <Text style={estilos.total}>{t.total}</Text>
          <Text style={estilos.totalValor}>{formatarMoeda(pedido.total)}</Text>
        </View>
      </View>

      {pedido.nfe_status === "CANCELADA" ? (
        <View style={estilos.notaCancelada} testID="nota-cancelada">
          <FileText size={18} color={cores.cinza600} strokeWidth={1.9} />
          <Text style={estilos.notaCanceladaTexto}>{t.notaCancelada}</Text>
        </View>
      ) : nota ? (
        <Botao
          titulo={t.notaFiscal}
          icone={FileText}
          variante="contorno"
          onPress={() => void abrirNota(nota)}
          accessibilityLabel={t.notaFiscalA11y}
          testID="ver-nota"
        />
      ) : null}

      <Secao titulo={t.entrega}>
        <View style={[estilos.cartao, estilos.linhaIcone]}>
          <MapPin size={18} color={cores.preto} strokeWidth={1.9} />
          <Text style={estilos.textoCorpo}>{pedido.entrega}</Text>
        </View>
        {pedido.observacao ? (
          <View style={[estilos.cartao, estilos.linhaIcone]}>
            <StickyNote size={18} color={cores.preto} strokeWidth={1.9} />
            <Text style={estilos.textoCorpo}>
              <Text style={estilos.rotuloForte}>{t.observacao}: </Text>
              {pedido.observacao}
            </Text>
          </View>
        ) : null}
      </Secao>

      <Secao titulo={t.historico}>
        <View style={estilos.cartao} testID="historico">
          <Marco
            titulo={t.pedidoCriado}
            data={formatarDataHora(pedido.created_at)}
            status="aguardando_pagamento"
            ultimo={pedido.eventos.length === 0}
          />
          {pedido.eventos.map((e, i) => (
            <Marco
              key={e.id}
              titulo={rotuloStatus(e.status_para)}
              data={formatarDataHora(e.criado_em)}
              a11y={t.deAte(e.status_de ? rotuloStatus(e.status_de) : "—", rotuloStatus(e.status_para))}
              status={e.status_para}
              ultimo={i === pedido.eventos.length - 1}
            />
          ))}
          {pedido.eventos.length === 0 ? <Text style={estilos.historicoVazio}>{t.historicoVazio}</Text> : null}
        </View>
      </Secao>
    </ScrollView>
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

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={estilos.linhaRotulo}>{rotulo}</Text>
      <Text style={estilos.linhaValor}>{valor}</Text>
    </View>
  );
}

/** Ponto da linha do tempo, na cor do status. */
function Marco({
  titulo,
  data,
  a11y,
  status,
  ultimo,
}: {
  titulo: string;
  data: string;
  a11y?: string;
  status: PedidoStatus;
  ultimo: boolean;
}) {
  const c = CORES_TOM[visualStatus(status).tom];
  return (
    <View style={estilos.marco} accessible accessibilityLabel={`${data}, ${a11y ?? titulo}`} testID="marco">
      <View style={estilos.trilho}>
        <View style={[estilos.ponto, { backgroundColor: c.texto, borderColor: c.borda }]} />
        {!ultimo ? <View style={estilos.linhaTrilho} /> : null}
      </View>
      <View style={estilos.marcoTextos}>
        <Text style={estilos.marcoTitulo}>{titulo}</Text>
        <Text style={estilos.marcoData}>{data}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espacos.lg, gap: espacos.lg },
  cabecalho: { gap: espacos.sm },
  titulo: {
    fontSize: fontes.tamanho.titulo,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.6,
  },
  data: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
  confirmacao: {
    flexDirection: "row",
    gap: espacos.sm,
    alignItems: "flex-start",
    padding: espacos.lg,
    borderRadius: raios.cartao,
    backgroundColor: cores.preto,
  },
  confirmacaoTexto: { flex: 1, fontSize: fontes.tamanho.corpo - 1, color: cores.branco, lineHeight: 20 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    padding: espacos.lg,
    ...sombras.cartao,
  },
  secao: { gap: espacos.sm + 2 },
  secaoTitulo: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.2,
  },
  item: { flexDirection: "row", gap: espacos.md, paddingVertical: espacos.sm },
  itemSeparado: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda, paddingTop: espacos.md },
  itemTextos: { flex: 1, gap: espacos.xs },
  itemNome: { fontSize: fontes.tamanho.corpo, fontWeight: fontes.peso.semibold, color: cores.texto, lineHeight: 20 },
  itemDetalhe: { fontSize: fontes.tamanho.pequeno, color: cores.textoSuave, fontVariant: ["tabular-nums"] },
  itemTotal: {
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  totais: { gap: espacos.sm },
  linha: { flexDirection: "row", justifyContent: "space-between", gap: espacos.md },
  linhaRotulo: { flex: 1, fontSize: fontes.tamanho.corpo - 1, color: cores.textoSuave },
  linhaValor: { fontSize: fontes.tamanho.corpo - 1, color: cores.cinza800, fontVariant: ["tabular-nums"] },
  linhaTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: espacos.md,
    marginTop: espacos.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  total: { fontSize: fontes.tamanho.destaque, fontWeight: fontes.peso.negrito, color: cores.texto },
  totalValor: {
    fontSize: fontes.tamanho.subtitulo + 2,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  notaCancelada: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.sm,
    padding: espacos.md,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza100,
  },
  notaCanceladaTexto: { fontSize: fontes.tamanho.pequeno + 1, color: cores.cinza700 },
  linhaIcone: { flexDirection: "row", gap: espacos.md, alignItems: "flex-start" },
  textoCorpo: { flex: 1, fontSize: fontes.tamanho.corpo - 1, color: cores.cinza800, lineHeight: 21 },
  rotuloForte: { fontWeight: fontes.peso.semibold, color: cores.texto },
  marco: { flexDirection: "row", gap: espacos.md },
  trilho: { width: 14, alignItems: "center" },
  ponto: { width: 12, height: 12, borderRadius: raios.pill, borderWidth: 2, marginTop: 4 },
  linhaTrilho: { flex: 1, width: 2, backgroundColor: cores.cinza200, marginVertical: 2 },
  marcoTextos: { flex: 1, paddingBottom: espacos.md, gap: 2 },
  marcoTitulo: { fontSize: fontes.tamanho.corpo - 1, fontWeight: fontes.peso.semibold, color: cores.texto },
  marcoData: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
  historicoVazio: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco, marginLeft: 14 + espacos.md },
});
