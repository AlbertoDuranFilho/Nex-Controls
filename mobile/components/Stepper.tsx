import { Minus, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ALVO_MINIMO, cores, fontes, raios } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { QUANTIDADE_MAXIMA, QUANTIDADE_MINIMA } from "@/lib/carrinho";

type Props = {
  /** quantidade atual (limites dos botões −/+) */
  valor: number;
  onPasso: (delta: number) => void;
  desabilitado?: boolean;
  /** campo digitável (tela do produto, carrinho); senão, só o número */
  editavel?: boolean;
  texto?: string;
  onTexto?: (texto: string) => void;
  /** ao sair do campo ou confirmar no teclado */
  onConfirmar?: () => void;
  /** rótulo do campo para leitor de tela */
  rotulo?: string;
  grande?: boolean;
  /** base dos testIDs: diminuir-<id>, quantidade-<id>, aumentar-<id> */
  idTeste: string;
};

/** Stepper −/+ de quantidade (1–9999), botões de 44 pt. Usado no catálogo, produto e carrinho. */
export function Stepper({
  valor,
  onPasso,
  desabilitado = false,
  editavel = false,
  texto,
  onTexto,
  onConfirmar,
  rotulo = textos.catalogo.quantidade,
  grande = false,
  idTeste,
}: Props) {
  return (
    <View style={[estilos.stepper, grande && estilos.stepperGrande]}>
      <BotaoPasso
        icone="menos"
        rotulo={textos.catalogo.diminuir}
        desabilitado={valor <= QUANTIDADE_MINIMA || desabilitado}
        onPress={() => onPasso(-1)}
        testID={`diminuir-${idTeste}`}
      />
      {editavel ? (
        <TextInput
          value={texto ?? String(valor)}
          onChangeText={(t) => onTexto?.(t.replace(/\D/g, "").slice(0, 4))}
          onBlur={onConfirmar}
          onSubmitEditing={onConfirmar}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={4}
          selectTextOnFocus
          editable={!desabilitado}
          style={[estilos.valor, estilos.valorEditavel, grande && estilos.valorGrande]}
          accessibilityLabel={rotulo}
          selectionColor={cores.preto}
          cursorColor={cores.preto}
          testID={`quantidade-${idTeste}`}
        />
      ) : (
        <Text
          style={estilos.valor}
          accessibilityLabel={textos.catalogo.quantidadeA11y(valor)}
          testID={`quantidade-${idTeste}`}
        >
          {valor}
        </Text>
      )}
      <BotaoPasso
        icone="mais"
        rotulo={textos.catalogo.aumentar}
        desabilitado={valor >= QUANTIDADE_MAXIMA || desabilitado}
        onPress={() => onPasso(1)}
        testID={`aumentar-${idTeste}`}
      />
    </View>
  );
}

function BotaoPasso({
  icone,
  rotulo,
  desabilitado,
  onPress,
  testID,
}: {
  icone: "menos" | "mais";
  rotulo: string;
  desabilitado: boolean;
  onPress: () => void;
  testID: string;
}) {
  const Icone = icone === "menos" ? Minus : Plus;
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      testID={testID}
      style={({ pressed }) => [estilos.passo, pressed && !desabilitado && estilos.passoPressionado]}
    >
      <Icone size={18} color={desabilitado ? cores.cinza300 : cores.preto} strokeWidth={2.2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.botao,
    backgroundColor: cores.branco,
    overflow: "hidden",
  },
  stepperGrande: { borderColor: cores.cinza300 },
  passo: {
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    alignItems: "center",
    justifyContent: "center",
  },
  passoPressionado: { backgroundColor: cores.cinza100 },
  valor: {
    minWidth: 32,
    textAlign: "center",
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  valorEditavel: { minWidth: 52, height: ALVO_MINIMO, paddingVertical: 0 },
  valorGrande: { minWidth: 56, height: ALVO_MINIMO + 8, fontSize: fontes.tamanho.destaque },
});
