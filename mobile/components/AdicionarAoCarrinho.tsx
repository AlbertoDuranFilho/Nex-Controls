import { Check, Minus, Plus, ShoppingCart } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Botao } from "@/components/ui/Botao";
import { ALVO_MINIMO, cores, espacos, fontes, raios } from "@/constants/tema";
import { textos } from "@/constants/textos";
import {
  adicionarAoCarrinho,
  lerQuantidade,
  limitarQuantidade,
  QUANTIDADE_MAXIMA,
  QUANTIDADE_MINIMA,
} from "@/lib/carrinho";
import { useContagemCarrinho } from "@/lib/contagem-carrinho";

const TEMPO_CONFIRMACAO = 2000;

type Props = {
  produtoId: string;
  /** "compacto" no cartão da lista; "completo" na tela do produto (quantidade digitável) */
  variante?: "compacto" | "completo";
};

/** Stepper −/+ e botão "Adicionar". Só é mostrado para lojista ativo com preço. */
export function AdicionarAoCarrinho({ produtoId, variante = "compacto" }: Props) {
  const { atualizarContagem } = useContagemCarrinho();
  const [texto, setTexto] = useState(String(QUANTIDADE_MINIMA));
  const [enviando, setEnviando] = useState(false);
  const [adicionado, setAdicionado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const montado = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const quantidade = lerQuantidade(texto);
  const atual = quantidade ?? QUANTIDADE_MINIMA;
  const completo = variante === "completo";

  function mudar(novoTexto: string) {
    setTexto(novoTexto);
    setAdicionado(false);
    setErro(null);
  }

  function passo(delta: number) {
    mudar(String(limitarQuantidade(atual + delta)));
  }

  async function adicionar() {
    if (quantidade === null || enviando) return;
    setErro(null);
    setAdicionado(false);
    setEnviando(true);
    const r = await adicionarAoCarrinho(produtoId, quantidade);
    if (!montado.current) return;
    setEnviando(false);
    if (r.ok) {
      setAdicionado(true);
      AccessibilityInfo.announceForAccessibility(textos.catalogo.adicionadoAoCarrinho);
      void atualizarContagem();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (montado.current) setAdicionado(false);
      }, TEMPO_CONFIRMACAO);
      return;
    }
    setErro(
      r.erro === "nao_logado"
        ? textos.catalogo.erroLogin
        : r.erro === "quantidade_invalida"
          ? textos.catalogo.erroQuantidade
          : textos.catalogo.erroIndisponivel,
    );
  }

  const mensagem = quantidade === null ? textos.catalogo.erroQuantidade : erro;

  return (
    <View style={estilos.container}>
      <View style={estilos.linha}>
        <View style={[estilos.stepper, completo && estilos.stepperCompleto]}>
          <BotaoPasso
            icone="menos"
            rotulo={textos.catalogo.diminuir}
            desabilitado={atual <= QUANTIDADE_MINIMA || enviando}
            onPress={() => passo(-1)}
            testID={`diminuir-${produtoId}`}
          />
          {completo ? (
            <TextInput
              value={texto}
              onChangeText={(t) => mudar(t.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => {
                if (quantidade === null) mudar(String(limitarQuantidade(Number(texto) || 1)));
              }}
              keyboardType="number-pad"
              maxLength={4}
              selectTextOnFocus
              editable={!enviando}
              style={[estilos.valor, estilos.valorCompleto]}
              accessibilityLabel={textos.catalogo.quantidade}
              selectionColor={cores.preto}
              cursorColor={cores.preto}
              testID={`quantidade-${produtoId}`}
            />
          ) : (
            <Text
              style={estilos.valor}
              accessibilityLabel={textos.catalogo.quantidadeA11y(atual)}
              testID={`quantidade-${produtoId}`}
            >
              {atual}
            </Text>
          )}
          <BotaoPasso
            icone="mais"
            rotulo={textos.catalogo.aumentar}
            desabilitado={atual >= QUANTIDADE_MAXIMA || enviando}
            onPress={() => passo(1)}
            testID={`aumentar-${produtoId}`}
          />
        </View>
        <Botao
          titulo={adicionado ? textos.catalogo.adicionado : textos.catalogo.adicionar}
          icone={adicionado ? Check : ShoppingCart}
          onPress={() => void adicionar()}
          carregando={enviando}
          desabilitado={quantidade === null}
          tamanho={completo ? "normal" : "compacto"}
          accessibilityLabel={
            adicionado ? textos.catalogo.adicionadoAoCarrinho : textos.catalogo.adicionarA11y(atual)
          }
          style={[estilos.botao, completo && estilos.botaoCompleto]}
          larguraTotal={false}
          testID={`adicionar-${produtoId}`}
        />
      </View>
      {mensagem ? (
        <Text style={estilos.erro} accessibilityLiveRegion="polite" testID={`erro-adicionar-${produtoId}`}>
          {mensagem}
        </Text>
      ) : null}
    </View>
  );
}

function BotaoPasso({
  icone,
  rotulo,
  desabilitado,
  onPress,
  testID,
}: {
  icone: "menos" | "mais";
  rotulo: string;
  desabilitado: boolean;
  onPress: () => void;
  testID: string;
}) {
  const Icone = icone === "menos" ? Minus : Plus;
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      testID={testID}
      style={({ pressed }) => [estilos.passo, pressed && !desabilitado && estilos.passoPressionado]}
    >
      <Icone size={18} color={desabilitado ? cores.cinza300 : cores.preto} strokeWidth={2.2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espacos.xs + 2 },
  linha: { flexDirection: "row", alignItems: "center", gap: espacos.sm },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.botao,
    backgroundColor: cores.branco,
    overflow: "hidden",
  },
  stepperCompleto: { borderColor: cores.cinza300 },
  passo: {
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    alignItems: "center",
    justifyContent: "center",
  },
  passoPressionado: { backgroundColor: cores.cinza100 },
  valor: {
    minWidth: 32,
    textAlign: "center",
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  valorCompleto: { minWidth: 56, height: ALVO_MINIMO + 8, paddingVertical: 0, fontSize: fontes.tamanho.destaque },
  botao: { flex: 1, minHeight: ALVO_MINIMO, paddingHorizontal: espacos.md },
  botaoCompleto: { minHeight: ALVO_MINIMO + 8 },
  erro: { fontSize: fontes.tamanho.pequeno, color: cores.erro },
});
