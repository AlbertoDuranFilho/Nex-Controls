import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { ALVO_MINIMO, cores, espacos, fontes, raios } from "@/constants/tema";

export type VarianteBotao = "primario" | "secundario" | "contorno" | "texto" | "perigo";

export type BotaoProps = {
  titulo: string;
  onPress?: () => void;
  variante?: VarianteBotao;
  tamanho?: "normal" | "compacto";
  icone?: LucideIcon;
  /** ícone à direita do texto (ex.: seta) */
  iconeDireita?: LucideIcon;
  carregando?: boolean;
  desabilitado?: boolean;
  larguraTotal?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const estilosVariante: Record<VarianteBotao, { fundo: string; texto: string; borda: string; fundoPressionado: string }> = {
  primario: { fundo: cores.preto, texto: cores.branco, borda: cores.preto, fundoPressionado: cores.cinza800 },
  secundario: { fundo: cores.cinza100, texto: cores.preto, borda: cores.cinza100, fundoPressionado: cores.cinza200 },
  contorno: { fundo: cores.branco, texto: cores.preto, borda: cores.preto, fundoPressionado: cores.cinza100 },
  texto: { fundo: "transparent", texto: cores.preto, borda: "transparent", fundoPressionado: cores.cinza100 },
  perigo: { fundo: cores.branco, texto: cores.erro, borda: cores.erro, fundoPressionado: cores.erroFundo },
};

export function Botao({
  titulo,
  onPress,
  variante = "primario",
  tamanho = "normal",
  icone: Icone,
  iconeDireita: IconeDireita,
  carregando = false,
  desabilitado = false,
  larguraTotal = true,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: BotaoProps) {
  const v = estilosVariante[variante];
  const inativo = desabilitado || carregando;
  const tamanhoIcone = tamanho === "compacto" ? 16 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      testID={testID}
      hitSlop={tamanho === "compacto" ? 6 : 0}
      style={({ pressed }) => [
        estilos.base,
        tamanho === "compacto" ? estilos.compacto : estilos.normal,
        larguraTotal && estilos.larguraTotal,
        {
          backgroundColor: pressed && !inativo ? v.fundoPressionado : v.fundo,
          borderColor: v.borda,
          opacity: desabilitado && !carregando ? 0.45 : 1,
        },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <View style={estilos.conteudo}>
          {Icone ? <Icone size={tamanhoIcone} color={v.texto} strokeWidth={2} /> : null}
          <Text
            style={[estilos.texto, tamanho === "compacto" && estilos.textoCompacto, { color: v.texto }]}
            numberOfLines={1}
          >
            {titulo}
          </Text>
          {IconeDireita ? <IconeDireita size={tamanhoIcone} color={v.texto} strokeWidth={2} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: raios.botao,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacos.xl,
  },
  normal: { minHeight: 52 },
  compacto: { minHeight: ALVO_MINIMO - 8, paddingHorizontal: espacos.lg },
  larguraTotal: { alignSelf: "stretch" },
  conteudo: { flexDirection: "row", alignItems: "center", gap: espacos.sm },
  texto: {
    fontSize: fontes.tamanho.corpo + 1,
    fontWeight: fontes.peso.semibold,
    letterSpacing: 0.2,
  },
  textoCompacto: { fontSize: fontes.tamanho.pequeno + 1 },
});
