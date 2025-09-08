import React from 'react';
import { Button, Linking, StyleSheet, Text, View } from 'react-native';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Termos de Uso</Text>
      <Button
        title="Abrir no site"
        onPress={() => Linking.openURL('https://seu-site.com/termos')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
});