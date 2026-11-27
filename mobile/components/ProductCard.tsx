import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlocoCompra } from "@/components/Preco";
import { Selo } from "@/components/ui/Selo";
import { cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import type { ProdutoPublico } from "@/lib/catalogo";
import type { EstadoPreco } from "@/lib/precos";

type Props = {
  produto: ProdutoPublico;
  estado: EstadoPreco;
  onPress?: () => void;
};

/** Miniatura 80×80; sem imagem (ou se falhar ao carregar) mostra um ícone no lugar. */
export function Miniatura({ url, tamanho = 80 }: { url: string | undefined; tamanho?: number }) {
  const [falhou, setFalhou] = useState(false);
  const caixa = { width: tamanho, height: tamanho };
  if (!url || falhou) {
    return (
      <View
        style={[estilos.imagem, estilos.semImagem, caixa]}
        accessibilityLabel={textos.catalogo.semImagem}
        testID="imagem-placeholder"
      >
        <ImageOff size={Math.round(tamanho * 0.32)} color={cores.cinza400} strokeWidth={1.6} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={[estilos.imagem, caixa]}
      contentFit="contain"
      transition={150}
      onError={() => setFalhou(true)}
      accessible={false}
      testID="imagem-produto"
    />
  );
}

/**
 * Cartão do catálogo: mesmo layout do app antigo (horizontal, imagem 80×80 à esquerda,
 * nome em negrito, código em etiqueta preta, linha de descrição cinza), mais o bloco de compra.
 */
function ProductCardBase({ produto, estado, onPress }: Props) {
  const descricao = produto.destaque || produto.compatibilidade || produto.descricao;
  return (
    <View style={estilos.cartao} testID={`cartao-${produto.id}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${produto.nome}, ${textos.catalogo.codigo(produto.codigo)}`}
        accessibilityHint={textos.catalogo.abrirProduto(produto.nome)}
        style={({ pressed }) => [estilos.topo, pressed && estilos.pressionado]}
        testID={`abrir-${produto.id}`}
      >
        <Miniatura url={produto.imagens[0]?.url} />
        <View style={estilos.info}>
          <Text style={estilos.nome} numberOfLines={2} testID="nome-produto">
            {produto.nome}
          </Text>
          <Selo texto={produto.codigo} formato="etiqueta" variante="escuro" style={estilos.codigo} />
          {descricao ? (
            <Text style={estilos.descricao} numberOfLines={1}>
              {descricao.replace(/\s+/g, " ").trim()}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {estado.tipo !== "erro" ? (
        <View style={estilos.rodape}>
          <BlocoCompra estado={estado} produtoId={produto.id} variante="compacto" />
        </View>
      ) : null}
    </View>
  );
}

export const ProductCard = memo(ProductCardBase);
export default ProductCard;

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartaoPequeno,
    padding: espacos.md,
    marginHorizontal: espacos.lg,
    marginBottom: espacos.md,
    ...sombras.cartao,
  },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raios.pequeno,
  },
  pressionado: { opacity: 0.85 },
  imagem: {
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza50,
  },
  semImagem: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.cinza100,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: espacos.md,
  },
  nome: {
    fontSize: fontes.tamanho.corpo + 1,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
    marginBottom: 6,
    lineHeight: 21,
  },
  codigo: { marginBottom: 6, maxWidth: "100%" },
  descricao: {
    fontSize: fontes.tamanho.legenda,
    color: cores.textoFraco,
  },
  rodape: {
    marginTop: espacos.md,
    paddingTop: espacos.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
});
