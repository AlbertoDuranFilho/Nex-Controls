import { StyleSheet, Text, View } from "react-native";
import { espacos, fontes, raios } from "@/constants/tema";
import { CORES_TOM, rotuloStatus, visualStatus } from "@/lib/pedidos";
import type { PedidoStatus } from "@/lib/pedidos";

/** Selo pill do status do pedido, com a cor e o ícone do site. */
export function StatusPedido({ status, testID }: { status: PedidoStatus; testID?: string }) {
  const { tom, icone: Icone } = visualStatus(status);
  const c = CORES_TOM[tom];
  return (
    <View
      style={[estilos.selo, { backgroundColor: c.fundo, borderColor: c.borda }]}
      accessible
      accessibilityLabel={rotuloStatus(status)}
      testID={testID}
    >
      <Icone size={13} color={c.texto} strokeWidth={2.2} />
      <Text style={[estilos.texto, { color: c.texto }]} numberOfLines={1}>
        {rotuloStatus(status)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.xs + 1,
    borderWidth: 1,
    borderRadius: raios.pill,
    paddingHorizontal: espacos.sm + 2,
    paddingVertical: 4,
  },
  texto: { fontSize: fontes.tamanho.legenda, fontWeight: fontes.peso.semibold },
});
