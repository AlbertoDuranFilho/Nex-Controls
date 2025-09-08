import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getProductById } from "../../../../../services/products";
import { Produto } from "../../../../../types/product";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Produto>();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"descricao" | "especificacoes" | "aplicacoes">("descricao");

  useEffect(() => {
    if (id) {
      getProductById(id)
        .then((data) => {
          setProduct(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Produto não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero azul */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Image
          source={{
            uri:
              product.imagens?.[0]?.url
               
          }}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <Text style={styles.heroCode}>{product.codigo}</Text>
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>{product.nome}</Text>

        {product.compatibilidade && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compatibilidade</Text>
            <Text style={styles.sectionText}>{product.compatibilidade}</Text>
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        > 
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "descricao" && styles.tabButtonActive]}
            onPress={() => setActiveTab("descricao")}
          >
            <Text style={[styles.tabText, activeTab === "descricao" && styles.tabTextActive]}>
              Descrição do produto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "especificacoes" && styles.tabButtonActive]}
            onPress={() => setActiveTab("especificacoes")}
          >
            <Text style={[styles.tabText, activeTab === "especificacoes" && styles.tabTextActive]}>
              Especificações Técnicas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "aplicacoes" && styles.tabButtonActive]}
            onPress={() => setActiveTab("aplicacoes")}
          >
            <Text style={[styles.tabText, activeTab === "aplicacoes" && styles.tabTextActive]}>
              Lista de produtos aplicados
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Conteúdo da Tab */}
        {activeTab === "descricao" && (
          <Text style={styles.sectionText}>
            {product.descricao && product.descricao[0]?.children?.[0]?.text}
          </Text>
        )}

        {activeTab === "especificacoes" && (
          <>
            {product.especificacoes?.map((spec) => (
              <View key={spec.id} style={styles.specRow}>
                <Text style={styles.specName}>{spec.nome}:</Text>
                <Text style={styles.specValue}>{spec.valor}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === "aplicacoes" && (
          <Text style={styles.sectionText}>
            {product.aplicacoes && product.aplicacoes[0]?.children?.[0]?.text}
          </Text>
        )}
      </ScrollView>

      {/* 🔥 Botão do manual fixo no fim da tela */}
      {product.manual && (
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() =>
            Linking.openURL(process.env.EXPO_PUBLIC_API_URL + product.manual!.url)
          }
        >
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.manualButtonText}>Baixar Manual</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: {
    backgroundColor: "#1B1C59",
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { position: "absolute", top: 50, left: 16, zIndex: 999 },
  heroImage: { width: width * 0.7, height: 180, marginBottom: 12 },
  heroCode: { fontSize: 20, fontWeight: "700", color: "#fff" },

  content: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16, color: "#1B1C59" },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1B1C59", marginBottom: 8 },
  sectionText: { fontSize: 14, color: "#444", lineHeight: 20 },

  tabsContainer: { flexDirection: "row", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tabButton: { marginRight: 16, paddingBottom: 6 },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: "#1B1C59" },
  tabText: { fontSize: 14, color: "#444" },
  tabTextActive: { color: "#1B1C59", fontWeight: "600" },

  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 4,
  },
  specName: { fontSize: 14, color: "#666" },
  specValue: { fontSize: 14, fontWeight: "600", color: "#333" },

  manualButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B1C59",
    paddingVertical: 14,
    borderRadius: 10,
  },
  manualButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});