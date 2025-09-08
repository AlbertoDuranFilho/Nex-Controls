import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../../../services/api";

export default function FormScreen() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!nome || !email) {
      Alert.alert("Atenção", "Preencha pelo menos Nome e E-mail!");
      return;
    }

    setLoading(true);

    try {
      await api.post("api/contatoes", {
        data: { nome, email, telefone },
      });

      Alert.alert("Sucesso", "Cadastro realizado com sucesso!");
      setNome("");
      setEmail("");
      setTelefone("");
      router.back();
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = nome.trim().length > 0 && email.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* 🔵 Topo azul com título */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Cadastre-se para receber nossas novidades
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nome */}
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu nome completo"
          value={nome}
          onChangeText={setNome}
        />

        {/* E-mail */}
        <Text style={styles.label}>E-mail *</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu e-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Telefone */}
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          placeholder="(99) 99999-9999"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
        />

        {/* Botão */}
        <TouchableOpacity
          style={[
            styles.button,
            !isFormValid && { backgroundColor: "#aaa" },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  /* 🔵 topo azul */
  header: {
    backgroundColor: "#1B1C59",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  /* labels + inputs */
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B1C59",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },

  /* botão */
  button: {
    marginTop: 30,
    backgroundColor: "#1B1C59",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});