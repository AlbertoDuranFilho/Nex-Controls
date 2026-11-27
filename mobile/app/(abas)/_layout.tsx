import { Tabs } from "expo-router";
import { LayoutGrid, Package, ShoppingCart, User } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { StyleSheet } from "react-native";
import type { ColorValue } from "react-native";
import { cores, fontes } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { textoContador, useContagemCarrinho } from "@/lib/contagem-carrinho";

function icone(Icone: LucideIcon) {
  function IconeAba({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icone size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />;
  }
  return IconeAba;
}

export default function LayoutAbas() {
  const { contagem } = useContagemCarrinho();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.preto,
        tabBarInactiveTintColor: cores.cinza400,
        tabBarStyle: estilos.barra,
        tabBarLabelStyle: estilos.rotulo,
        tabBarItemStyle: estilos.item,
        headerStyle: estilos.cabecalho,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitleStyle: estilos.tituloCabecalho,
        headerTintColor: cores.preto,
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: textos.abas.catalogo, tabBarIcon: icone(LayoutGrid) }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: textos.abas.carrinho,
          tabBarIcon: icone(ShoppingCart),
          tabBarBadge: textoContador(contagem),
          tabBarBadgeStyle: estilos.contador,
          tabBarAccessibilityLabel:
            contagem > 0
              ? `${textos.abas.carrinho}, ${textos.abas.itensNoCarrinho(contagem)}`
              : textos.abas.carrinho,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{ title: textos.abas.pedidos, tabBarIcon: icone(Package) }}
      />
      <Tabs.Screen name="conta" options={{ title: textos.abas.conta, tabBarIcon: icone(User) }} />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: {
    backgroundColor: cores.branco,
    borderTopColor: cores.borda,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    minHeight: 64,
  },
  item: { minHeight: 48 },
  rotulo: {
    fontSize: fontes.tamanho.legenda - 1,
    fontWeight: fontes.peso.semibold,
    letterSpacing: 0.2,
  },
  cabecalho: { backgroundColor: cores.fundo },
  tituloCabecalho: {
    fontSize: fontes.tamanho.titulo - 2,
    fontWeight: fontes.peso.negrito,
    color: cores.preto,
    letterSpacing: -0.4,
  },
  contador: {
    backgroundColor: cores.preto,
    color: cores.branco,
    fontSize: 10,
    fontWeight: fontes.peso.negrito,
    borderWidth: 1.5,
    borderColor: cores.branco,
  },
});
