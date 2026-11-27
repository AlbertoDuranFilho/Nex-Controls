import { Check, ShoppingCart } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { Stepper } from "@/components/Stepper";
import { Botao } from "@/components/ui/Botao";
import { ALVO_MINIMO, cores, espacos, fontes } from "@/constants/tema";
import { textos } from "@/constants/textos";
import { adicionarAoCarrinho, lerQuantidade, limitarQuantidade, QUANTIDADE_MINIMA } from "@/lib/carrinho";
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
  const enviandoRef = useRef(false);
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
    // ref, não estado: dois toques no mesmo quadro não podem enviar duas vezes
    if (quantidade === null || enviandoRef.current) return;
    enviandoRef.current = true;
    setErro(null);
    setAdicionado(false);
    setEnviando(true);
    let r: Awaited<ReturnType<typeof adicionarAoCarrinho>>;
    try {
      r = await adicionarAoCarrinho(produtoId, quantidade);
    } finally {
      enviandoRef.current = false;
    }
    // o item já foi gravado: o contador da aba é atualizado mesmo se o cartão saiu da tela
    if (r.ok) void atualizarContagem();
    if (!montado.current) return;
    setEnviando(false);
    if (r.ok) {
      setAdicionado(true);
      AccessibilityInfo.announceForAccessibility(textos.catalogo.adicionadoAoCarrinho);
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
        <Stepper
          valor={atual}
          onPasso={passo}
          desabilitado={enviando}
          editavel={completo}
          texto={texto}
          onTexto={mudar}
          onConfirmar={() => {
            if (quantidade === null) mudar(String(limitarQuantidade(Number(texto) || 1)));
          }}
          grande={completo}
          idTeste={produtoId}
        />
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

const estilos = StyleSheet.create({
  container: { gap: espacos.xs + 2 },
  linha: { flexDirection: "row", alignItems: "center", gap: espacos.sm },
  botao: { flex: 1, minHeight: ALVO_MINIMO, paddingHorizontal: espacos.md },
  botaoCompleto: { minHeight: ALVO_MINIMO + 8 },
  erro: { fontSize: fontes.tamanho.pequeno, color: cores.erro },
});
