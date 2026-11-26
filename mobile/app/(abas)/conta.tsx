import { LogOut, User } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { ExigeLogin } from "@/components/ExigeLogin";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { useSessao } from "@/lib/sessao";

// Conta do lojista. Dados, endereço, contato e exclusão chegam na Task 4.
function ConteudoConta() {
  const { email, lojistaAtivo, sair } = useSessao();
  return (
    <View style={estilos.tela}>
      <View style={estilos.cartao}>
        <View style={estilos.avatar}>
          <User size={26} color={cores.branco} strokeWidth={1.8} />
        </View>
        <View style={estilos.info}>
          <Text style={estilos.legenda}>{textos.conta.conectadoComo}</Text>
          <Text style={estilos.email} numberOfLines={1}>
            {email}
          </Text>
          {!lojistaAtivo ? (
            <Selo texto={textos.sessao.cadastroInativoTitulo} variante="aviso" style={estilos.selo} />
          ) : null}
        </View>
      </View>
      <Botao titulo={textos.sessao.sair} icone={LogOut} variante="contorno" onPress={() => void sair()} />
    </View>
  );
}

export default function TelaConta() {
  return (
    <ExigeLogin>
      <ConteudoConta />
    </ExigeLogin>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: espacos.lg, gap: espacos.lg, backgroundColor: cores.fundo },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.lg,
    padding: espacos.lg,
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    ...sombras.cartao,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: raios.pill,
    backgroundColor: cores.preto,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  legenda: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco },
  email: { fontSize: fontes.tamanho.destaque, fontWeight: fontes.peso.semibold, color: cores.texto },
  selo: { marginTop: espacos.xs },
});
