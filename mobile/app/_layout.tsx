import { Slot } from "expo-router";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

function LayoutWrapper() {
  const insets = useSafeAreaInsets(); // pega altura do notch/status bar dinamicamente

  return (
    <View style={{flex: 1}}>
      {/* 🔵 Topo azul com altura exata do notch */}
      <View style={{ height: insets.top, backgroundColor: "#1B1C59" }}>
        <StatusBar barStyle="light-content" backgroundColor="#1B1C59" />
      </View>

      {/* ⬜ Corpo branco */}
      <View style={{flex: 1, backgroundColor: "#fff", paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, }}>
        <Slot />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LayoutWrapper />
    </SafeAreaProvider>
  );
}
