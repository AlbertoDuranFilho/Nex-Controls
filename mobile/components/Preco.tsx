import { useRouter } from "expo-router";
import { ChevronRight, LogIn, ShieldAlert, WifiOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { AdicionarAoCarrinho } from "@/components/AdicionarAoCarrinho";
import { Faixa } from "@/components/ui/Faixa";
import { Selo } from "@/components/ui/Selo";
import { ALVO_MINIMO, cores, espacos, fontes, raios } from "@/constants/tema";
import { textos } from "@/constants/textos";
import type { EstadoPreco, PrecoCliente, SituacaoPrecos } from "@/lib/precos";
import { formatarMoeda, temDesconto, textoDesconto } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

type Tamanho = "normal" | "grande";

/** Preço final em destaque; com desconto, preço de tabela riscado e selo "-X%". */
export function Preco({ preco, tamanho = "normal" }: { preco: PrecoCliente; tamanho?: Tamanho }) {
  const comDesconto = temDesconto(preco);
  const final = formatarMoeda(preco.final);
  const grande = tamanho === "grande";
  return (
    <View style={estilos.preco}>
      {comDesconto ? (
        <View style={estilos.linhaDesconto}>
          <Text
            style={[estilos.tabela, grande && estilos.tabelaGrande]}
            accessibilityLabel={textos.catalogo.precoTabelaA11y(formatarMoeda(preco.tabela))}
            testID="preco-tabela"
          >
            {formatarMoeda(preco.tabela)}
          </Text>
          <Selo
            texto={textoDesconto(preco.desconto)}
            variante="escuro"
            accessibilityLabel={textos.catalogo.descontoA11y(`${textoDesconto(preco.desconto).slice(1)}`)}
            testID="selo-desconto"
          />
        </View>
      ) : null}
      <Text
        style={[estilos.final, grande && estilos.finalGrande]}
        accessibilityLabel={textos.catalogo.precoFinalA11y(final)}
        testID="preco-final"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {final}
      </Text>
    </View>
  );
}

type BlocoProps = {
  estado: EstadoPreco;
  produtoId: string;
  variante?: "compacto" | "completo";
};

/**
 * Bloco de compra (cartão e tela do produto), a partir do mesmo estado:
 * visitante → "Entre para ver preços"; inativo/sem preço → "Sob consulta";
 * erro → nada (a tela mostra o aviso com "Tentar de novo"); preço → valor + stepper + Adicionar.
 */
export function BlocoCompra({ estado, produtoId, variante = "compacto" }: BlocoProps) {
  const router = useRouter();
  const completo = variante === "completo";

  switch (estado.tipo) {
    case "carregando":
      return (
        <View
          style={[estilos.esqueleto, completo && estilos.esqueletoCompleto]}
          accessibilityLabel={textos.geral.carregando}
          testID={`preco-carregando-${produtoId}`}
        />
      );
    case "erro":
      return null;
    case "visitante":
      return (
        <Pressable
          onPress={() => router.push("/login")}
          accessibilityRole="button"
          accessibilityLabel={textos.catalogo.entreParaVerPrecos}
          style={({ pressed }) => [estilos.entrar, completo && estilos.entrarCompleto, pressed && estilos.pressionado]}
          testID={`entre-precos-${produtoId}`}
        >
          <LogIn size={16} color={cores.preto} strokeWidth={2} />
          <Text style={estilos.entrarTexto}>{textos.catalogo.entreParaVerPrecos}</Text>
          <ChevronRight size={16} color={cores.cinza500} strokeWidth={2} />
        </Pressable>
      );
    case "consulta":
      return (
        <View style={estilos.consulta} testID={`sob-consulta-${produtoId}`}>
          <Text style={[estilos.consultaTexto, completo && estilos.consultaTextoGrande]}>
            {textos.catalogo.sobConsulta}
          </Text>
        </View>
      );
    case "preco":
      return (
        <View style={[estilos.compra, completo && estilos.compraCompleta]}>
          <Preco preco={estado} tamanho={completo ? "grande" : "normal"} />
          <AdicionarAoCarrinho produtoId={produtoId} variante={variante} />
        </View>
      );
  }
}

/**
 * Aviso acima da lista/do bloco de compra: perfil ou preços não carregaram ("Tentar de novo")
 * ou cadastro inativo. Visitante não vê aviso (cada cartão já mostra "Entre para ver preços").
 */
export function AvisoPrecos({
  situacao,
  recarregarPrecos,
  style,
}: {
  situacao: SituacaoPrecos;
  recarregarPrecos: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { carregando, papel, lojistaAtivo, recarregarPerfil } = useSessao();
  if (carregando) return null;
  if (papel === "erro" || (papel === "lojista" && lojistaAtivo && situacao === "erro")) {
    return (
      <Faixa
        icone={WifiOff}
        texto={textos.catalogo.erroPrecos}
        acao={{
          titulo: textos.sessao.tentarDeNovo,
          onPress: papel === "erro" ? recarregarPerfil : recarregarPrecos,
        }}
        style={style}
        testID="aviso-erro-precos"
      />
    );
  }
  if (papel === "lojista" && !lojistaAtivo) {
    return (
      <Faixa icone={ShieldAlert} texto={textos.catalogo.cadastroInativo} style={style} testID="aviso-inativo" />
    );
  }
  return null;
}

const estilos = StyleSheet.create({
  preco: { gap: 2 },
  linhaDesconto: { flexDirection: "row", alignItems: "center", gap: espacos.sm },
  tabela: {
    fontSize: fontes.tamanho.pequeno,
    color: cores.textoFraco,
    textDecorationLine: "line-through",
  },
  tabelaGrande: { fontSize: fontes.tamanho.corpo },
  final: {
    fontSize: fontes.tamanho.destaque + 1,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  finalGrande: { fontSize: fontes.tamanho.titulo, letterSpacing: -0.6 },
  compra: { gap: espacos.sm + 2 },
  compraCompleta: { gap: espacos.lg },
  esqueleto: {
    height: ALVO_MINIMO,
    borderRadius: raios.botao,
    backgroundColor: cores.cinza100,
  },
  esqueletoCompleto: { height: 120 },
  entrar: {
    minHeight: ALVO_MINIMO,
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.sm,
    paddingHorizontal: espacos.md,
    borderRadius: raios.botao,
    backgroundColor: cores.cinza100,
  },
  entrarCompleto: { minHeight: 52, paddingHorizontal: espacos.lg },
  entrarTexto: {
    flex: 1,
    fontSize: fontes.tamanho.pequeno + 1,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
  },
  pressionado: { backgroundColor: cores.cinza200 },
  consulta: {
    minHeight: ALVO_MINIMO,
    justifyContent: "center",
  },
  consultaTexto: {
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.semibold,
    color: cores.textoSuave,
  },
  consultaTextoGrande: { fontSize: fontes.tamanho.destaque },
});
