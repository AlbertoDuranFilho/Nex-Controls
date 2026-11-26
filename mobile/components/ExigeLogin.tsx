import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { LogIn, ShieldAlert } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Botao } from "@/components/ui/Botao";
import { cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { useSessao } from "@/lib/sessao";

export function Carregando({ rotulo = textos.geral.carregando }: { rotulo?: string }) {
  return (
    <View style={estilos.centro} accessibilityLabel={rotulo} accessibilityRole="progressbar">
      <ActivityIndicator color={cores.preto} size="large" />
    </View>
  );
}

type AvisoProps = {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: { titulo: string; onPress: () => void; icone?: LucideIcon; variante?: "primario" | "contorno" };
  testID?: string;
};

/** Estado vazio/aviso em cartão central: ícone em círculo preto, título, texto e uma ação. */
export function AvisoCentral({ icone: Icone, titulo, descricao, acao, testID }: AvisoProps) {
  return (
    <View style={estilos.centro} testID={testID}>
      <View style={estilos.cartao}>
        <View style={estilos.circulo}>
          <Icone size={26} color={cores.branco} strokeWidth={1.8} />
        </View>
        <Text style={estilos.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        {descricao ? <Text style={estilos.descricao}>{descricao}</Text> : null}
        {acao ? (
          <Botao
            titulo={acao.titulo}
            onPress={acao.onPress}
            icone={acao.icone}
            variante={acao.variante ?? "primario"}
            style={estilos.botao}
          />
        ) : null}
      </View>
    </View>
  );
}

export function EntreParaContinuar() {
  const router = useRouter();
  return (
    <AvisoCentral
      icone={LogIn}
      titulo={textos.sessao.entreParaContinuar}
      descricao={textos.sessao.entreDescricao}
      acao={{ titulo: textos.sessao.entrar, onPress: () => router.push("/login") }}
      testID="entre-para-continuar"
    />
  );
}

/**
 * Protege as abas de cliente (Carrinho, Pedidos, Conta).
 * Visitante (ou admin, que é desconectado) vê "Entre para continuar".
 * Com `exigirAtivo`, lojista inativo vê o aviso de cadastro inativo e pode sair.
 */
export function ExigeLogin({ children, exigirAtivo = false }: { children: ReactNode; exigirAtivo?: boolean }) {
  const { carregando, papel, lojistaAtivo, sair } = useSessao();
  if (carregando) return <Carregando />;
  if (papel !== "lojista") return <EntreParaContinuar />;
  if (exigirAtivo && !lojistaAtivo) {
    return (
      <AvisoCentral
        icone={ShieldAlert}
        titulo={textos.sessao.cadastroInativoTitulo}
        descricao={textos.sessao.cadastroInativo}
        acao={{ titulo: textos.sessao.sair, onPress: () => void sair(), variante: "contorno" }}
        testID="cadastro-inativo"
      />
    );
  }
  return <>{children}</>;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: espacos.xl,
    backgroundColor: cores.fundo,
  },
  cartao: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    paddingHorizontal: espacos.xl,
    paddingVertical: espacos.xxl,
    gap: espacos.md,
    ...sombras.cartao,
  },
  circulo: {
    width: 64,
    height: 64,
    borderRadius: raios.pill,
    backgroundColor: cores.preto,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacos.xs,
  },
  titulo: {
    fontSize: fontes.tamanho.subtitulo,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  descricao: {
    fontSize: fontes.tamanho.corpo,
    color: cores.textoSuave,
    textAlign: "center",
    lineHeight: 22,
  },
  botao: { marginTop: espacos.sm },
});
