import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight, Package, RefreshCw, WifiOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { ListRenderItem } from "react-native";
import { AvisoCentral, Carregando, ExigeLogin } from "@/components/ExigeLogin";
import { StatusPedido } from "@/components/StatusPedido";
import { Faixa } from "@/components/ui/Faixa";
import { cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { formatarData, listarMeusPedidos, rotuloStatus } from "@/lib/pedidos";
import type { PedidoResumo } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

const t = textos.pedidos;

// Pedidos do lojista (inativo também vê o histórico, como no site).
export default function TelaPedidos() {
  return (
    <ExigeLogin>
      <ListaPedidos />
    </ExigeLogin>
  );
}

type Carga = { usuarioId: string; pedidos: PedidoResumo[] } | "erro" | null;

function ListaPedidos() {
  const router = useRouter();
  const { usuarioId } = useSessao();
  const [carga, setCarga] = useState<Carga>(null);
  const [erroAtualizar, setErroAtualizar] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const carregar = useCallback(() => {
    if (!usuarioId) return Promise.resolve(false);
    return listarMeusPedidos(usuarioId).then(
      (pedidos) => {
        if (!vivo.current) return false;
        setCarga({ usuarioId, pedidos });
        setErroAtualizar(false);
        return true;
      },
      () => {
        if (!vivo.current) return false;
        // já com lista: mantém e avisa em faixa; sem lista: tela de erro
        setCarga((c) => (c && c !== "erro" && c.usuarioId === usuarioId ? c : "erro"));
        setErroAtualizar(true);
        return false;
      },
    );
  }, [usuarioId]);

  // Relê ao abrir a aba (um pedido novo ou mudança de status feita no admin).
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function atualizar() {
    setAtualizando(true);
    await carregar();
    if (vivo.current) setAtualizando(false);
  }

  // lista de outro usuário (troca de conta) não vale
  const lista = carga && carga !== "erro" && carga.usuarioId === usuarioId ? carga.pedidos : null;

  if (carga === "erro") {
    return (
      <AvisoCentral
        icone={WifiOff}
        titulo={t.erroCarregarTitulo}
        descricao={t.erroCarregar}
        acao={{
          titulo: textos.geral.tentarNovamente,
          icone: RefreshCw,
          onPress: () => {
            setCarga(null);
            void carregar();
          },
        }}
        testID="pedidos-erro"
      />
    );
  }
  if (!lista) return <Carregando />;

  const renderItem: ListRenderItem<PedidoResumo> = ({ item }) => (
    <CartaoPedido
      pedido={item}
      onPress={() => router.push({ pathname: "/pedido/[numero]", params: { numero: String(item.numero) } })}
    />
  );

  return (
    <FlatList
      data={lista}
      keyExtractor={(p) => String(p.numero)}
      renderItem={renderItem}
      style={estilos.tela}
      contentContainerStyle={[estilos.conteudo, lista.length === 0 && estilos.conteudoVazio]}
      ListHeaderComponent={
        erroAtualizar ? <Faixa icone={WifiOff} texto={t.erroCarregar} style={estilos.faixa} /> : undefined
      }
      ListEmptyComponent={
        <AvisoCentral
          icone={Package}
          titulo={t.vazio}
          descricao={t.vazioDescricao}
          acao={{ titulo: t.irCatalogo, onPress: () => router.navigate("/") }}
          testID="pedidos-vazio"
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void atualizar()}
          colors={[cores.preto]}
          tintColor={cores.preto}
        />
      }
      testID="lista-pedidos"
    />
  );
}

function CartaoPedido({ pedido, onPress }: { pedido: PedidoResumo; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.abrir(pedido.numero, rotuloStatus(pedido.status))}
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}
      testID={`pedido-${pedido.numero}`}
    >
      <View style={estilos.icone}>
        <Package size={20} color={cores.preto} strokeWidth={1.8} />
      </View>
      <View style={estilos.corpo}>
        <View style={estilos.linha}>
          <Text style={estilos.numero}>{t.numero(pedido.numero)}</Text>
          <Text style={estilos.total}>{formatarMoeda(pedido.total)}</Text>
        </View>
        <Text style={estilos.data}>{formatarData(pedido.created_at)}</Text>
        <StatusPedido status={pedido.status} testID={`status-${pedido.numero}`} />
      </View>
      <ChevronRight size={20} color={cores.cinza400} strokeWidth={2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espacos.lg, gap: espacos.md, paddingBottom: espacos.xxxl },
  conteudoVazio: { flexGrow: 1, padding: 0 },
  faixa: { marginBottom: espacos.xs },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.md,
    padding: espacos.lg,
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    ...sombras.cartao,
  },
  pressionado: { backgroundColor: cores.cinza50 },
  icone: {
    width: 44,
    height: 44,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza100,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  corpo: { flex: 1, gap: espacos.xs + 1 },
  linha: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: espacos.sm },
  numero: { fontSize: fontes.tamanho.destaque - 1, fontWeight: fontes.peso.negrito, color: cores.texto },
  total: {
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  data: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
});
