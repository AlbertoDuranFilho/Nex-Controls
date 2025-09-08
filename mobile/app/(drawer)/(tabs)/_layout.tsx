import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
  const navigation = useNavigation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B1C59', // azul escuro
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: {
            height: 60, // altura menor como no print
            paddingBottom: 6, // centraliza texto
            paddingTop: 6, // centraliza ícones
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
          tabBarIconStyle: {
            marginBottom: -2, // ajuda a alinhar melhor
          },
      }}
    >
      {/* Produtos */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Novidades */}
      <Tabs.Screen
        name="subscribe"
        options={{
          title: 'Novidades',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Menu (abre Drawer, não uma tela real) */}
      <Tabs.Screen
        name="menu"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <Ionicons name="menu-outline" color={color} size={size} />
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Impede navegação para uma rota inexistente
            e.preventDefault();
            navigation.dispatch(DrawerActions.openDrawer());
          },
        }}
      />
    </Tabs>
  );
}