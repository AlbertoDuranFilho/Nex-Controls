import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ChevronLeft, FileText, ImageOff, MessageCircle, PackageSearch, RefreshCw, WifiOff } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvisoCentral, Carregando } from "@/components/ExigeLogin";
import { AvisoPrecos, BlocoCompra } from "@/components/Preco";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { ALVO_MINIMO, cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { blocosDeTexto, obterProdutoPorSlug } from "@/lib/catalogo";
import { abrirContato } from "@/lib/contato";
import type { ImagemProduto, ProdutoPublico } from "@/lib/catalogo";
import { usePrecosCliente } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

const ALTURA_GALERIA = 320;

type Carga = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "pronto"; produto: ProdutoPublico | null };

export default function TelaProduto() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { papel, recarregarPerfil } = useSessao();
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });
  const [atualizando, setAtualizando] = useState(false);
  const vivo = useRef(true);

  const carregar = useCallback(
    () =>
      (typeof slug === "string" && slug ? obterProdutoPorSlug(slug) : Promise.resolve(null)).then(
        (produto) => {
          if (vivo.current) setCarga({ tipo: "pronto", produto });
          return true;
        },
        () => {
          // já mostrando o produto (puxar para atualizar): mantém; senão, tela de erro
          if (vivo.current) setCarga((c) => (c.tipo === "pronto" ? c : { tipo: "erro" }));
          return false;
        },
      ),
    [slug],
  );

  useEffect(() => {
    vivo.current = true;
    void carregar();
    return () => {
      vivo.current = false;
    };
  }, [carregar]);

  const produto = carga.tipo === "pronto" ? carga.produto : null;
  const ids = useMemo(() => (produto ? [produto.id] : null), [produto]);
  const precos = usePrecosCliente(ids);
  const { recarregar: recarregarPrecos } = precos;

  const voltar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    if (papel === "erro") recarregarPerfil();
    await carregar();
    // mesmo se o produto não recarregar, tenta de novo os preços
    recarregarPrecos();
    if (vivo.current) setAtualizando(false);
  }, [carregar, papel, recarregarPerfil, recarregarPrecos]);

  const botaoVoltar = <BotaoVoltar onPress={voltar} topo={insets.top + espacos.sm} />;

  if (carga.tipo === "carregando") {
    return (
      <View style={estilos.tela}>
        <Carregando />
        {botaoVoltar}
      </View>
    );
  }

  if (carga.tipo === "erro" || !produto) {
    const erro = carga.tipo === "erro";
    return (
      <View style={estilos.tela}>
        <AvisoCentral
          icone={erro ? WifiOff : PackageSearch}
          titulo={erro ? textos.catalogo.indisponivelTitulo : textos.produto.naoEncontrado}
          descricao={erro ? textos.catalogo.indisponivel : textos.produto.naoEncontradoDescricao}
          acao={
            erro
              ? {
                  titulo: textos.geral.tentarNovamente,
                  icone: RefreshCw,
                  onPress: () => {
                    setCarga({ tipo: "carregando" });
                    void carregar();
                  },
                }
              : { titulo: textos.geral.voltarAoCatalogo, onPress: voltar }
          }
          testID={erro ? "produto-erro" : "produto-nao-encontrado"}
        />
        {botaoVoltar}
      </View>
    );
  }

  const estado = precos.estadoDe(produto.id);
  const descricao = blocosDeTexto(produto.descricao);
  const aplicacoes = blocosDeTexto(produto.aplicacoes);
  const manual = produto.manual_url && /^https?:\/\//i.test(produto.manual_url) ? produto.manual_url : null;

  async function abrirManual(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(textos.produto.erroManual);
    }
  }

  return (
    <View style={estilos.tela}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + espacos.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            colors={[cores.preto]}
            tintColor={cores.preto}
            progressViewOffset={insets.top}
          />
        }
        testID="tela-produto"
      >
        <View style={[estilos.topoGaleria, { paddingTop: insets.top }]}>
          <Galeria imagens={produto.imagens} nome={produto.nome} />
        </View>

        <View style={estilos.corpo}>
          <Selo texto={produto.codigo} formato="etiqueta" variante="escuro" />
          <Text style={estilos.nome} accessibilityRole="header">
            {produto.nome}
          </Text>
          {produto.destaque ? <Text style={estilos.destaque}>{produto.destaque}</Text> : null}
          {produto.compatibilidade ? (
            <Text style={estilos.compatibilidade}>
              <Text style={estilos.rotuloForte}>{textos.produto.compatibilidade}: </Text>
              {produto.compatibilidade}
            </Text>
          ) : null}

          <AvisoPrecos situacao={precos.situacao} recarregarPrecos={recarregarPrecos} />
          {estado.tipo !== "erro" ? (
            <View style={[estilos.cartao, estilos.cartaoCompra]}>
              <BlocoCompra estado={estado} produtoId={produto.id} variante="completo" />
              {estado.tipo === "consulta" || estado.tipo === "visitante" ? (
                <Botao
                  titulo={textos.orcamento.solicitar}
                  icone={MessageCircle}
                  variante="contorno"
                  onPress={() =>
                    void abrirContato({
                      assunto: textos.contato.assuntoOrcamento(produto.codigo),
                      texto: textos.contato.mensagemOrcamento(produto.codigo, produto.nome),
                    })
                  }
                  accessibilityLabel={textos.orcamento.solicitarA11y(produto.codigo)}
                  testID="solicitar-orcamento"
                />
              ) : null}
            </View>
          ) : null}

          {manual ? (
            <Botao
              titulo={textos.produto.manual}
              icone={FileText}
              variante="contorno"
              onPress={() => void abrirManual(manual)}
              accessibilityLabel={textos.produto.manualA11y}
              testID="abrir-manual"
            />
          ) : null}

          {descricao.length ? (
            <Secao titulo={textos.produto.descricao}>
              <Texto blocos={descricao} />
            </Secao>
          ) : null}

          {produto.especificacoes.length ? (
            <Secao titulo={textos.produto.especificacoes}>
              <View style={[estilos.cartao, estilos.cartaoTabela]} testID="especificacoes">
                {produto.especificacoes.map((esp, i) => (
                  <View
                    key={`${esp.nome}-${i}`}
                    style={[estilos.linhaEspec, i > 0 && estilos.linhaEspecSeparada]}
                  >
                    <Text style={estilos.especNome}>{esp.nome}</Text>
                    <Text style={estilos.especValor}>{esp.valor}</Text>
                  </View>
                ))}
              </View>
            </Secao>
          ) : null}

          {aplicacoes.length ? (
            <Secao titulo={textos.produto.aplicacoes}>
              <Texto blocos={aplicacoes} />
            </Secao>
          ) : null}
        </View>
      </ScrollView>
      {botaoVoltar}
    </View>
  );
}

function BotaoVoltar({ onPress, topo }: { onPress: () => void; topo: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={textos.produto.voltar}
      style={({ pressed }) => [estilos.voltar, { top: topo }, pressed && estilos.voltarPressionado]}
      testID="voltar"
    >
      <ChevronLeft size={24} color={cores.preto} strokeWidth={2.2} />
    </Pressable>
  );
}

function Galeria({ imagens, nome }: { imagens: ImagemProduto[]; nome: string }) {
  const { width: largura } = useWindowDimensions();
  const [indice, setIndice] = useState(0);

  if (imagens.length === 0) {
    return (
      <View style={[estilos.semImagem, { width: largura }]} testID="galeria-vazia">
        <ImageOff size={40} color={cores.cinza400} strokeWidth={1.5} />
        <Text style={estilos.semImagemTexto}>{textos.catalogo.semImagem}</Text>
      </View>
    );
  }

  function aoParar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, largura));
    setIndice(Math.min(imagens.length - 1, Math.max(0, i)));
  }

  return (
    <View>
      <FlatList
        data={imagens}
        keyExtractor={(img, i) => `${img.url}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoParar}
        getItemLayout={(_, i) => ({ length: largura, offset: largura * i, index: i })}
        renderItem={({ item, index }) => (
          <ImagemGaleria
            url={item.url}
            largura={largura}
            rotulo={item.alt || `${nome}, ${textos.produto.imagem(index + 1, imagens.length)}`}
          />
        )}
        testID="galeria"
      />
      {imagens.length > 1 ? (
        <View
          style={estilos.pontos}
          accessibilityLabel={textos.produto.imagem(indice + 1, imagens.length)}
          testID="galeria-pontos"
        >
          {imagens.map((img, i) => (
            <View key={`${img.url}-${i}`} style={[estilos.ponto, i === indice && estilos.pontoAtivo]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ImagemGaleria({ url, largura, rotulo }: { url: string; largura: number; rotulo: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return (
      <View style={[estilos.semImagem, { width: largura }]} accessibilityLabel={textos.catalogo.semImagem}>
        <ImageOff size={40} color={cores.cinza400} strokeWidth={1.5} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: largura, height: ALTURA_GALERIA }}
      contentFit="contain"
      transition={150}
      accessibilityLabel={rotulo}
      onError={() => setFalhou(true)}
    />
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

function Texto({ blocos }: { blocos: ReturnType<typeof blocosDeTexto> }) {
  return (
    <View style={estilos.texto}>
      {blocos.map((b, i) =>
        b.tipo === "lista" ? (
          <View key={i} style={estilos.lista}>
            {b.itens.map((item, j) => (
              <View key={j} style={estilos.itemLista}>
                <Text style={estilos.marcador}>•</Text>
                <Text style={[estilos.paragrafo, estilos.itemTexto]}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text key={i} style={estilos.paragrafo}>
            {b.texto}
          </Text>
        ),
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topoGaleria: {
    backgroundColor: cores.branco,
    borderBottomLeftRadius: raios.cartao + 8,
    borderBottomRightRadius: raios.cartao + 8,
    paddingBottom: espacos.md,
    overflow: "hidden",
  },
  semImagem: {
    height: ALTURA_GALERIA,
    alignItems: "center",
    justifyContent: "center",
    gap: espacos.sm,
    backgroundColor: cores.cinza50,
  },
  semImagemTexto: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
  pontos: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: espacos.sm,
  },
  ponto: { width: 6, height: 6, borderRadius: raios.pill, backgroundColor: cores.cinza300 },
  pontoAtivo: { width: 18, backgroundColor: cores.preto },
  voltar: {
    position: "absolute",
    left: espacos.lg,
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    borderRadius: raios.pill,
    backgroundColor: cores.branco,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.cartao,
  },
  voltarPressionado: { backgroundColor: cores.cinza100 },
  corpo: { paddingHorizontal: espacos.lg, paddingTop: espacos.xl, gap: espacos.md },
  nome: {
    fontSize: fontes.tamanho.titulo - 2,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  destaque: { fontSize: fontes.tamanho.corpo, color: cores.textoSuave, fontStyle: "italic", lineHeight: 22 },
  compatibilidade: { fontSize: fontes.tamanho.pequeno + 1, color: cores.textoSuave, lineHeight: 20 },
  rotuloForte: { fontWeight: fontes.peso.semibold, color: cores.cinza800 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    padding: espacos.lg,
    ...sombras.cartao,
  },
  cartaoTabela: { paddingVertical: espacos.xs },
  cartaoCompra: { gap: espacos.md },
  secao: { gap: espacos.sm + 2, marginTop: espacos.md },
  secaoTitulo: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.2,
  },
  linhaEspec: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: espacos.md,
    paddingVertical: espacos.md,
  },
  linhaEspecSeparada: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda },
  especNome: { flex: 1, fontSize: fontes.tamanho.pequeno + 1, fontWeight: fontes.peso.semibold, color: cores.cinza800 },
  especValor: { flex: 1, fontSize: fontes.tamanho.pequeno + 1, color: cores.textoSuave, textAlign: "right" },
  texto: { gap: espacos.md },
  paragrafo: { fontSize: fontes.tamanho.corpo, color: cores.cinza700, lineHeight: 23 },
  lista: { gap: espacos.xs + 2 },
  itemLista: { flexDirection: "row", gap: espacos.sm },
  marcador: { fontSize: fontes.tamanho.corpo, color: cores.preto, lineHeight: 23 },
  itemTexto: { flex: 1 },
});
