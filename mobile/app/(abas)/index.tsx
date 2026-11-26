import { useRouter } from "expo-router";
import { PackageSearch, RefreshCw, Search, WifiOff, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { ListRenderItem } from "react-native";
import { AvisoCentral } from "@/components/ExigeLogin";
import { AvisoPrecos } from "@/components/Preco";
import { ProductCard } from "@/components/ProductCard";
import { Faixa } from "@/components/ui/Faixa";
import { ALVO_MINIMO, cores, espacos, fontes, raios } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { filtrarProdutos, listarProdutos } from "@/lib/catalogo";
import type { ProdutoPublico } from "@/lib/catalogo";
import { usePrecosCliente } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

type Carga = "carregando" | "pronto" | "erro";

// Catálogo público: visitante vê os produtos sem preço; lojista ativo vê o seu preço.
export default function TelaCatalogo() {
  const router = useRouter();
  const { papel, recarregarPerfil } = useSessao();
  const [produtos, setProdutos] = useState<ProdutoPublico[] | null>(null);
  const [carga, setCarga] = useState<Carga>("carregando");
  const [atualizando, setAtualizando] = useState(false);
  const [erroAtualizar, setErroAtualizar] = useState(false);
  const [busca, setBusca] = useState("");
  const vivo = useRef(true);

  // ids da lista inteira (não da busca): uma única chamada a precos_cliente por carga
  const ids = useMemo(() => (produtos ? produtos.map((p) => p.id) : null), [produtos]);
  const precos = usePrecosCliente(ids);
  const { recarregar: recarregarPrecos } = precos;

  const carregar = useCallback(
    () =>
      listarProdutos().then(
        (lista) => {
          if (!vivo.current) return false;
          setProdutos(lista);
          setCarga("pronto");
          setErroAtualizar(false);
          return true;
        },
        () => {
          if (!vivo.current) return false;
          // sem lista ainda: tela de erro; com lista: mantém e avisa em faixa
          setCarga((c) => (c === "pronto" ? c : "erro"));
          setErroAtualizar(true);
          return false;
        },
      ),
    [],
  );

  useEffect(() => {
    vivo.current = true;
    void carregar();
    return () => {
      vivo.current = false;
    };
  }, [carregar]);

  const tentarDeNovo = useCallback(() => {
    setCarga("carregando");
    void carregar();
  }, [carregar]);

  const puxarParaAtualizar = useCallback(async () => {
    setAtualizando(true);
    if (papel === "erro") recarregarPerfil();
    const ok = await carregar();
    if (ok) recarregarPrecos();
    if (vivo.current) setAtualizando(false);
  }, [carregar, papel, recarregarPerfil, recarregarPrecos]);

  const filtrados = useMemo(() => (produtos ? filtrarProdutos(produtos, busca) : []), [produtos, busca]);

  const abrir = useCallback(
    (slug: string) => router.push({ pathname: "/produto/[slug]", params: { slug } }),
    [router],
  );

  const renderItem: ListRenderItem<ProdutoPublico> = useCallback(
    ({ item }) => (
      <ProductCard produto={item} estado={precos.estadoDe(item.id)} onPress={() => abrir(item.slug)} />
    ),
    [precos, abrir],
  );

  const barraBusca = <BarraBusca valor={busca} onChange={setBusca} />;

  if (carga === "carregando") {
    return (
      <View style={estilos.tela}>
        {barraBusca}
        <EsqueletoLista />
      </View>
    );
  }

  if (carga === "erro") {
    return (
      <AvisoCentral
        icone={WifiOff}
        titulo={textos.catalogo.indisponivelTitulo}
        descricao={textos.catalogo.indisponivel}
        acao={{ titulo: textos.geral.tentarNovamente, onPress: tentarDeNovo, icone: RefreshCw }}
        testID="catalogo-erro"
      />
    );
  }

  const cabecalho = (
    <View style={estilos.avisos}>
      {erroAtualizar ? (
        <Faixa
          icone={WifiOff}
          texto={textos.catalogo.indisponivel}
          acao={{ titulo: textos.sessao.tentarDeNovo, onPress: () => void puxarParaAtualizar() }}
          testID="aviso-erro-catalogo"
        />
      ) : null}
      <AvisoPrecos situacao={precos.situacao} recarregarPrecos={recarregarPrecos} />
    </View>
  );

  const semProdutos = (produtos?.length ?? 0) === 0;

  return (
    <View style={estilos.tela}>
      {barraBusca}
      <FlatList
        data={filtrados}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        extraData={precos}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={
          semProdutos ? (
            <AvisoCentral
              icone={PackageSearch}
              titulo={textos.catalogo.catalogoVazio}
              descricao={textos.catalogo.catalogoVazioDescricao}
              testID="catalogo-vazio"
            />
          ) : (
            <AvisoCentral
              icone={PackageSearch}
              titulo={textos.catalogo.nenhumResultado}
              descricao={textos.catalogo.nenhumResultadoDescricao}
              acao={{ titulo: textos.catalogo.limparBusca, onPress: () => setBusca(""), variante: "contorno" }}
              testID="busca-vazia"
            />
          )
        }
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void puxarParaAtualizar()}
            colors={[cores.preto]}
            tintColor={cores.preto}
            progressBackgroundColor={cores.branco}
          />
        }
        initialNumToRender={8}
        windowSize={9}
        testID="lista-produtos"
      />
    </View>
  );
}

function BarraBusca({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [focado, setFocado] = useState(false);
  return (
    <View style={estilos.buscaContainer}>
      <View style={[estilos.busca, focado && estilos.buscaFocada]}>
        <Search size={18} color={focado ? cores.preto : cores.cinza500} strokeWidth={2} />
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={textos.catalogo.buscaPlaceholder}
          placeholderTextColor={cores.cinza400}
          accessibilityLabel={textos.catalogo.buscar}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={cores.preto}
          cursorColor={cores.preto}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          style={estilos.buscaEntrada}
          testID="campo-busca"
        />
        {valor ? (
          <Pressable
            onPress={() => onChange("")}
            accessibilityRole="button"
            accessibilityLabel={textos.catalogo.limparBusca}
            style={estilos.limpar}
            testID="limpar-busca"
          >
            <X size={18} color={cores.cinza600} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Cartões cinza pulsando enquanto o catálogo carrega. */
function EsqueletoLista() {
  const [opacidade] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [opacidade]);

  return (
    <Animated.View
      style={[estilos.conteudo, { opacity: opacidade }]}
      accessibilityLabel={textos.geral.carregando}
      accessibilityRole="progressbar"
      testID="catalogo-carregando"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={estilos.esqueletoCartao}>
          <View style={estilos.esqueletoImagem} />
          <View style={estilos.esqueletoInfo}>
            <View style={[estilos.esqueletoLinha, { width: "85%" }]} />
            <View style={[estilos.esqueletoLinha, estilos.esqueletoCodigo]} />
            <View style={[estilos.esqueletoLinha, { width: "60%", height: 10 }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, paddingBottom: espacos.xl },
  avisos: { paddingHorizontal: espacos.lg, gap: espacos.sm, marginBottom: espacos.sm },
  buscaContainer: {
    paddingHorizontal: espacos.lg,
    paddingTop: espacos.xs,
    paddingBottom: espacos.md,
    backgroundColor: cores.fundo,
  },
  busca: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.sm + 2,
    paddingLeft: espacos.md + 2,
    paddingRight: espacos.xs,
    borderRadius: raios.campo,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  buscaFocada: { borderColor: cores.preto, borderWidth: 1.5 },
  buscaEntrada: {
    flex: 1,
    minHeight: 46,
    fontSize: fontes.tamanho.corpo,
    color: cores.texto,
    paddingVertical: espacos.sm,
  },
  limpar: {
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    alignItems: "center",
    justifyContent: "center",
  },
  esqueletoCartao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.superficie,
    borderRadius: raios.cartaoPequeno,
    padding: espacos.md,
    marginHorizontal: espacos.lg,
    marginBottom: espacos.md,
  },
  esqueletoImagem: { width: 80, height: 80, borderRadius: raios.cartaoPequeno, backgroundColor: cores.cinza100 },
  esqueletoInfo: { flex: 1, marginLeft: espacos.md, gap: espacos.sm },
  esqueletoLinha: { height: 14, borderRadius: raios.pequeno, backgroundColor: cores.cinza100 },
  esqueletoCodigo: { width: 72, height: 22 },
});
