// app/(drawer)/_layout.tsx
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Logo from '../../assets/images/logo.png';

function CustomDrawerContent() {
  const router = useRouter();

  return (
    <DrawerContentScrollView contentContainerStyle={{ flex: 1 }}>
      {/* Cabeçalho com logo */}
      <View style={styles.header}>
        <Image
          source={Logo }
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Links de navegação */}
      <DrawerItem
        label="Termos de Uso"
        onPress={() => router.push("/(drawer)/terms")}
      />

      <View style={{ flex: 1 }} />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        drawerPosition: "right",
      }}
      drawerContent={() => <CustomDrawerContent />}
    >
      {/* 👇 Aqui você registra as telas dentro do Drawer */}
      <Drawer.Screen
        name="(tabs)" // 🔑 agora o Drawer sabe que Tabs é uma tela principal
        options={{ title: "Início" }}
      />
      <Drawer.Screen
        name="terms"
        options={{ title: "Termos de Uso" }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 40, paddingHorizontal: 20, alignItems: "center" },
  logo: { width: 140, height: 100, marginBottom: 12 },
  brand: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
});