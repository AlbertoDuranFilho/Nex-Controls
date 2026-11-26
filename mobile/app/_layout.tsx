import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cores } from "@/constants/tema";
import { ContagemCarrinhoProvider } from "@/lib/contagem-carrinho";
import { SessaoProvider, useSessao } from "@/lib/sessao";

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navegacao() {
  const { carregando } = useSessao();

  // Mantém a splash até ler a sessão salva (evita piscar "Entre para continuar").
  useEffect(() => {
    if (!carregando) void SplashScreen.hideAsync().catch(() => {});
  }, [carregando]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="(abas)" />
      <Stack.Screen name="login" options={{ animation: "slide_from_bottom", contentStyle: { backgroundColor: cores.preto } }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessaoProvider>
        <ContagemCarrinhoProvider>
          <StatusBar style="dark" />
          <Navegacao />
        </ContagemCarrinhoProvider>
      </SessaoProvider>
    </SafeAreaProvider>
  );
}
