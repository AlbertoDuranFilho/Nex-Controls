import { Stack } from "expo-router";

export default function ProductsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Produtos" }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}