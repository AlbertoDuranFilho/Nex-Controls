import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { cores, espacos, fontes, raios } from "@/constants/tema";

export type VarianteSelo = "escuro" | "claro" | "contorno" | "sucesso" | "aviso" | "erro" | "info";

export type SeloProps = {
  texto: string;
  variante?: VarianteSelo;
  icone?: LucideIcon;
  /** "pill" (padrão) para status; "etiqueta" com cantos 8 para código de produto */
  formato?: "pill" | "etiqueta";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export const coresSelo: Record<VarianteSelo, { fundo: string; texto: string; borda: string }> = {
  escuro: { fundo: cores.preto, texto: cores.branco, borda: cores.preto },
  claro: { fundo: cores.cinza100, texto: cores.cinza800, borda: cores.cinza100 },
  contorno: { fundo: "transparent", texto: cores.preto, borda: cores.cinza300 },
  sucesso: { fundo: cores.sucessoFundo, texto: cores.sucesso, borda: cores.sucessoFundo },
  aviso: { fundo: cores.avisoFundo, texto: cores.aviso, borda: cores.avisoFundo },
  erro: { fundo: cores.erroFundo, texto: cores.erro, borda: cores.erroFundo },
  info: { fundo: cores.infoFundo, texto: cores.info, borda: cores.infoFundo },
};

export function Selo({
  texto,
  variante = "escuro",
  icone: Icone,
  formato = "pill",
  style,
  accessibilityLabel,
  testID,
}: SeloProps) {
  const c = coresSelo[variante];
  return (
    <View
      style={[
        estilos.base,
        formato === "pill" ? estilos.pill : estilos.etiqueta,
        { backgroundColor: c.fundo, borderColor: c.borda },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {Icone ? <Icone size={12} color={c.texto} strokeWidth={2.4} /> : null}
      <Text style={[estilos.texto, { color: c.texto }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.xs,
    borderWidth: 1,
  },
  pill: { borderRadius: raios.pill, paddingHorizontal: espacos.sm + 2, paddingVertical: 3 },
  etiqueta: { borderRadius: raios.pequeno, paddingHorizontal: espacos.sm + 2, paddingVertical: espacos.xs },
  texto: {
    fontSize: fontes.tamanho.legenda,
    fontWeight: fontes.peso.semibold,
    letterSpacing: 0.3,
  },
});
