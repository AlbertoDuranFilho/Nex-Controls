// app/(tabs)/menu.tsx
import { StyleSheet, Text, View } from "react-native";

export default function MenuPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Abrindo o Menu…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { color: "#aaa" },
});