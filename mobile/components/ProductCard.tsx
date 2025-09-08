import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  title: string;
  code?: string;
  description?: string;
  imageUrl: string;
  onPress?: () => void;
};

export default function ProductCard({ title, code, description, imageUrl, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Imagem */}
      <Image source={{ uri: imageUrl }} style={styles.image} />

      {/* Informações */}
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>

        {code && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        )}

        {description && (
          <Text style={styles.desc} numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B1C59",
    marginBottom: 6,
  },
  codeContainer: {
    alignSelf: "flex-start", // botão não ocupa a largura toda
    backgroundColor: "#1B1C59", // azul da marca
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  codeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  desc: {
    fontSize: 12,
    color: "#777",
  },
});