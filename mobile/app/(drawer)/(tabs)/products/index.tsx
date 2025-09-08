import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ProductCard from '../../../../components/ProductCard';
import { getProducts } from "../../../../services/products";
import { Produto } from "../../../../types/product";


const CATEGORIES = ['Lavadoras', 'Refrigeradores', 'Bebedouros'];

export default function ProductsListScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Lavadoras');

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Text>Carregando produtos...</Text>;

  return (
    <>
      {/* 🔵 Bloco azul no topo */}
      <View style={styles.topSection}>
        <TextInput
          placeholder="código / compatibilidade / modelo"
          placeholderTextColor="#888"
          style={styles.search}
          value={search}
          onChangeText={setSearch}
        />

        {/* Título Produtos */}
        <Text style={styles.headerTitle}>Produtos</Text>
      </View>

      {/* ⬜ Conteúdo branco */}
      <View style={styles.content}>
        {/* Tabs de categoria */}
        <View style={styles.tabs}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, selectedCategory === cat && styles.tabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de produtos */}
       <FlatList
      data={products}
      keyExtractor={(item) => item.documentId}
      renderItem={({ item }) => (
        <ProductCard
          title={item.nome}
          code={item.codigo}
          description={item.compatibilidade}
          imageUrl={item.imagens?.[0]?.url ?? "https://via.placeholder.com/150"}
          onPress={() =>
            router.push(`/(drawer)/(tabs)/products/product/${item.documentId}`)
          }
          />
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // 🔵 Parte azul (até o topo do notch)
  topSection: {
    backgroundColor: '#1B1C59',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  search: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    marginTop: 10,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
    textAlign: "center",
  },

  // Conteúdo branco abaixo
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderColor: '#007AFF',
  },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },

  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
});