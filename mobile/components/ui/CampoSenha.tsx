import { Eye, EyeOff, Lock } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ALVO_MINIMO, cores, raios } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { Campo } from "./Campo";
import type { CampoProps } from "./Campo";

export type CampoSenhaProps = Omit<CampoProps, "secureTextEntry" | "acessorioDireita" | "icone" | "rotulo"> & {
  rotulo?: string;
};

export function CampoSenha({ rotulo = textos.login.senha, ...resto }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const Icone = visivel ? EyeOff : Eye;
  const rotuloBotao = visivel ? textos.login.ocultarSenha : textos.login.mostrarSenha;

  return (
    <Campo
      rotulo={rotulo}
      icone={Lock}
      secureTextEntry={!visivel}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="current-password"
      textContentType="password"
      {...resto}
      acessorioDireita={
        <Pressable
          onPress={() => setVisivel((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={rotuloBotao}
          hitSlop={4}
          testID="campo-senha-alternar"
          style={({ pressed }) => [estilos.olho, pressed && estilos.olhoPressionado]}
        >
          <Icone size={20} color={cores.cinza600} strokeWidth={2} />
        </Pressable>
      }
    />
  );
}

const estilos = StyleSheet.create({
  olho: {
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    marginRight: -10,
    borderRadius: raios.botao,
    alignItems: "center",
    justifyContent: "center",
  },
  olhoPressionado: { backgroundColor: cores.cinza100 },
});
