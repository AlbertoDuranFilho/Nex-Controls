import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { ALVO_MINIMO, cores, espacos, fontes, raios } from "@/constants/tema";

type Props = {
  icone: LucideIcon;
  texto: string;
  acao?: { titulo: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Aviso discreto em linha (ex.: "Não foi possível carregar seus preços" + "Tentar de novo"). */
export function Faixa({ icone: Icone, texto, acao, style, testID }: Props) {
  return (
    <View style={[estilos.faixa, style]} testID={testID} accessibilityLiveRegion="polite">
      <Icone size={18} color={cores.cinza700} strokeWidth={2} />
      <Text style={estilos.texto}>{texto}</Text>
      {acao ? (
        <Pressable
          onPress={acao.onPress}
          accessibilityRole="button"
          accessibilityLabel={acao.titulo}
          hitSlop={4}
          style={({ pressed }) => [estilos.acao, pressed && estilos.acaoPressionada]}
        >
          <Text style={estilos.acaoTexto}>{acao.titulo}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.sm + 2,
    paddingLeft: espacos.md + 2,
    paddingRight: espacos.xs,
    paddingVertical: espacos.xs,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza100,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  texto: {
    flex: 1,
    paddingVertical: espacos.sm,
    fontSize: fontes.tamanho.pequeno,
    color: cores.cinza800,
    lineHeight: 18,
  },
  acao: {
    minHeight: ALVO_MINIMO,
    justifyContent: "center",
    paddingHorizontal: espacos.md,
    borderRadius: raios.botao,
  },
  acaoPressionada: { backgroundColor: cores.cinza200 },
  acaoTexto: {
    fontSize: fontes.tamanho.pequeno,
    fontWeight: fontes.peso.negrito,
    color: cores.preto,
    textDecorationLine: "underline",
  },
});
