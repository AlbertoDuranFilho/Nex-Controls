import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, ArrowRight, Mail, MonitorSmartphone, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { ALVO_MINIMO, cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { CAMINHO_POLITICA } from "@/constants/contato";
import { textos } from "@/constants/textos";
import { abrirPaginaDoSite } from "@/lib/contato";
import { useSessao } from "@/lib/sessao";

const logo = require("@/assets/images/logo.png");

type Aviso = { tipo: "erro"; mensagem: string } | { tipo: "admin" } | null;

export default function TelaLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entrar } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const senhaRef = useRef<TextInputInstance>(null);

  function fechar() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function enviar() {
    if (enviando) return;
    setAviso(null);
    setEnviando(true);
    const resultado = await entrar(email, senha);
    setEnviando(false);
    if (resultado.tipo === "ok") {
      fechar();
    } else if (resultado.tipo === "admin") {
      setSenha("");
      setAviso({ tipo: "admin" });
    } else {
      setAviso({ tipo: "erro", mensagem: resultado.mensagem });
    }
  }

  return (
    <View style={estilos.tela}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.rolagem}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[estilos.topo, { paddingTop: insets.top + espacos.sm }]}>
            <Pressable
              onPress={fechar}
              accessibilityRole="button"
              accessibilityLabel={textos.geral.fechar}
              style={({ pressed }) => [estilos.fechar, pressed && estilos.fecharPressionado]}
              testID="login-fechar"
            >
              <X size={22} color={cores.branco} strokeWidth={2} />
            </Pressable>
            <Image
              source={logo}
              style={estilos.logo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={textos.marca.descricaoLogo}
            />
          </View>

          <View style={[estilos.cartao, { paddingBottom: insets.bottom + espacos.xl }]}>
            <Text style={estilos.titulo} accessibilityRole="header">
              {textos.login.titulo}
            </Text>
            <Text style={estilos.subtitulo}>{textos.login.subtitulo}</Text>

            {aviso?.tipo === "admin" ? (
              <View style={[estilos.aviso, estilos.avisoAdmin]} testID="aviso-admin" accessibilityLiveRegion="polite">
                <MonitorSmartphone size={20} color={cores.preto} strokeWidth={2} />
                <View style={estilos.flex}>
                  <Text style={estilos.avisoTitulo}>{textos.login.adminTitulo}</Text>
                  <Text style={estilos.avisoTexto}>{textos.login.adminMensagem}</Text>
                </View>
              </View>
            ) : null}
            {aviso?.tipo === "erro" ? (
              <View style={[estilos.aviso, estilos.avisoErro]} testID="aviso-erro" accessibilityLiveRegion="polite">
                <AlertCircle size={20} color={cores.erro} strokeWidth={2} />
                <Text style={[estilos.avisoTexto, estilos.avisoTextoErro]}>{aviso.mensagem}</Text>
              </View>
            ) : null}

            <View style={estilos.campos}>
              <Campo
                rotulo={textos.login.email}
                icone={Mail}
                value={email}
                onChangeText={setEmail}
                placeholder={textos.login.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
                submitBehavior="submit"
                editable={!enviando}
                testID="login-email"
              />
              <CampoSenha
                ref={senhaRef}
                value={senha}
                onChangeText={setSenha}
                placeholder={textos.login.senhaPlaceholder}
                returnKeyType="go"
                onSubmitEditing={() => void enviar()}
                editable={!enviando}
                testID="login-senha"
              />
            </View>

            <Botao
              titulo={textos.login.entrar}
              iconeDireita={ArrowRight}
              onPress={() => void enviar()}
              carregando={enviando}
              accessibilityLabel={enviando ? textos.login.entrando : textos.login.entrar}
              testID="login-entrar"
            />
            <Botao titulo={textos.login.voltarAoCatalogo} variante="texto" onPress={fechar} />

            <Text style={estilos.rodape}>{textos.login.semCadastro}</Text>
            <Pressable
              onPress={() => void abrirPaginaDoSite(CAMINHO_POLITICA)}
              accessibilityRole="link"
              style={estilos.politica}
              testID="login-politica"
            >
              <Text style={estilos.politicaTexto}>{textos.login.politica}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.preto },
  flex: { flex: 1 },
  rolagem: { flexGrow: 1 },
  topo: {
    backgroundColor: cores.preto,
    alignItems: "center",
    paddingHorizontal: espacos.lg,
    paddingBottom: espacos.xxxl + espacos.lg,
  },
  fechar: {
    alignSelf: "flex-start",
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    borderRadius: raios.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fecharPressionado: { backgroundColor: cores.cinza800 },
  logo: {
    width: 190,
    height: 100,
    marginTop: espacos.lg,
    tintColor: cores.branco,
  },
  cartao: {
    flexGrow: 1,
    marginTop: -espacos.xxl,
    backgroundColor: cores.branco,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: espacos.xl,
    paddingTop: espacos.xxl,
    gap: espacos.lg,
    ...sombras.flutuante,
  },
  titulo: {
    fontSize: fontes.tamanho.titulo,
    fontWeight: fontes.peso.negrito,
    color: cores.preto,
    letterSpacing: -0.5,
  },
  subtitulo: {
    marginTop: -espacos.sm,
    fontSize: fontes.tamanho.corpo,
    color: cores.textoSuave,
    lineHeight: 22,
  },
  campos: { gap: espacos.lg },
  aviso: {
    flexDirection: "row",
    gap: espacos.md,
    padding: espacos.lg,
    borderRadius: raios.cartaoPequeno,
    borderWidth: 1,
  },
  avisoAdmin: { backgroundColor: cores.cinza50, borderColor: cores.preto },
  avisoErro: { backgroundColor: cores.erroFundo, borderColor: cores.erroFundo, alignItems: "center" },
  avisoTitulo: {
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.negrito,
    color: cores.preto,
    marginBottom: 2,
  },
  avisoTexto: { fontSize: fontes.tamanho.pequeno + 1, color: cores.cinza700, lineHeight: 20 },
  avisoTextoErro: { flex: 1, color: cores.erro, fontWeight: fontes.peso.medio },
  politica: { alignSelf: "center", minHeight: ALVO_MINIMO, justifyContent: "center", paddingHorizontal: espacos.md },
  politicaTexto: {
    fontSize: fontes.tamanho.pequeno,
    color: cores.cinza700,
    fontWeight: fontes.peso.semibold,
    textDecorationLine: "underline",
  },
  rodape: {
    marginTop: "auto",
    textAlign: "center",
    fontSize: fontes.tamanho.pequeno,
    color: cores.textoFraco,
    lineHeight: 19,
  },
});
