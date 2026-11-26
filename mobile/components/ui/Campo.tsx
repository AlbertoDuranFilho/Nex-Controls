import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import type { ReactNode, Ref } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputInstance, TextInputProps, ViewStyle } from "react-native";
import { cores, espacos, fontes, raios } from "@/constants/tema";

export type CampoProps = Omit<TextInputProps, "style"> & {
  rotulo: string;
  icone?: LucideIcon;
  erro?: string | null;
  /** conteúdo à direita dentro da caixa (ex.: botão do olho na senha) */
  acessorioDireita?: ReactNode;
  estiloContainer?: StyleProp<ViewStyle>;
  ref?: Ref<TextInputInstance>;
};

export function Campo({
  rotulo,
  icone: Icone,
  erro,
  acessorioDireita,
  estiloContainer,
  ref,
  onFocus,
  onBlur,
  editable = true,
  accessibilityLabel,
  ...resto
}: CampoProps) {
  const [focado, setFocado] = useState(false);
  const corBorda = erro ? cores.erro : focado ? cores.preto : cores.borda;

  return (
    <View style={[estilos.container, estiloContainer]}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View
        style={[
          estilos.caixa,
          { borderColor: corBorda, borderWidth: focado || erro ? 1.5 : 1 },
          !editable && estilos.caixaDesabilitada,
        ]}
      >
        {Icone ? (
          <Icone size={18} color={focado ? cores.preto : cores.cinza500} strokeWidth={2} />
        ) : null}
        <TextInput
          ref={ref}
          style={estilos.entrada}
          placeholderTextColor={cores.cinza400}
          selectionColor={cores.preto}
          cursorColor={cores.preto}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? rotulo}
          aria-invalid={erro ? true : undefined}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          {...resto}
        />
        {acessorioDireita}
      </View>
      {erro ? (
        <Text style={estilos.erro} accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espacos.xs + 2 },
  rotulo: {
    fontSize: fontes.tamanho.pequeno,
    fontWeight: fontes.peso.semibold,
    color: cores.cinza700,
    letterSpacing: 0.2,
  },
  caixa: {
    minHeight: 52,
    borderRadius: raios.campo,
    backgroundColor: cores.branco,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacos.md + 2,
    gap: espacos.sm + 2,
  },
  caixaDesabilitada: { backgroundColor: cores.cinza100 },
  entrada: {
    flex: 1,
    minHeight: 48,
    fontSize: fontes.tamanho.corpo + 1,
    color: cores.texto,
    paddingVertical: espacos.sm,
  },
  erro: { fontSize: fontes.tamanho.pequeno, color: cores.erro },
});
