import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  CircleCheck,
  ImageOff,
  MapPin,
  Package,
  RefreshCw,
  ShoppingCart,
  Tag,
  Trash2,
  TriangleAlert,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AvisoCentral, Carregando, ExigeLogin } from "@/components/ExigeLogin";
import { Stepper } from "@/components/Stepper";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { CAMINHO_ENDERECO } from "@/constants/contato";
import { ALVO_MINIMO, cores, espacos, fontes, raios, sombras } from "@/constants/tema";
import { textos } from "@/constants/textos";
import {
  atualizarQuantidade,
  buscarInfoItens,
  gerarPedido,
  lerQuantidade,
  limitarQuantidade,
  LIMITE_OBSERVACAO,
  removerItem,
  simularCarrinho,
} from "@/lib/carrinho";
import type { InfoItem, ItemSimulacao, Simulacao } from "@/lib/carrinho";
import { abrirPaginaDoSite } from "@/lib/contato";
import { somarQuantidades, useContagemCarrinho } from "@/lib/contagem-carrinho";
import { mensagemBloqueio, mensagemCupom } from "@/lib/mensagens-carrinho";
import { notificarPedidoEmSegundoPlano } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/precos";
import { useSessao } from "@/lib/sessao";

const t = textos.carrinho;

type Carga = "carregando" | "erro" | "pronto";
type Recalculo = { ok: false } | { ok: true; sim: Simulacao | null };

const qtdsDe = (s: Simulacao) => Object.fromEntries(s.itens.map((i) => [i.produto_id, String(i.quantidade)]));

// Carrinho do lojista ativo: mesmas regras e mensagens do carrinho do site.
export default function TelaCarrinho() {
  return (
    <ExigeLogin exigirAtivo>
      <ConteudoCarrinho />
    </ExigeLogin>
  );
}

function ConteudoCarrinho() {
  const router = useRouter();
  const { usuarioId } = useSessao();
  const { definirContagem, atualizarContagem } = useContagemCarrinho();
  const [carga, setCarga] = useState<Carga>("carregando");
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [info, setInfo] = useState<Map<string, InfoItem>>(() => new Map());
  const [qtds, setQtds] = useState<Record<string, string>>({});
  // Cupom aplicado: reenviado a cada simulação. cupomTexto é só o campo.
  const [cupom, setCupom] = useState<string | null>(null);
  const [cupomTexto, setCupomTexto] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Falha sem resposta ao gerar: o pedido pode ter sido criado. Orienta a conferir em Pedidos.
  const [incerto, setIncerto] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [concluido, setConcluido] = useState<number | null>(null);
  const vivo = useRef(true);
  const ocupadoRef = useRef(false);
  const cupomRef = useRef<string | null>(null);
  const infoRef = useRef(info);
  // só a resposta da simulação mais recente vale (recarregar e alterar podem se cruzar)
  const pedidoSimulacao = useRef(0);
  const focado = useRef(false);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);
  useEffect(() => {
    cupomRef.current = cupom;
  }, [cupom]);
  useEffect(() => {
    infoRef.current = info;
  }, [info]);

  // Toda alteração termina aqui: uma chamada a simular_pedido com o cupom atual.
  // Resposta antiga (outra simulação começou depois) é descartada: { ok: true, sim: null }.
  const recalcular = useCallback((cupomAtual: string | null): Promise<Recalculo> => {
    const id = ++pedidoSimulacao.current;
    return simularCarrinho(cupomAtual).then((r): Recalculo => {
        if (!vivo.current) return { ok: false };
        if (id !== pedidoSimulacao.current) return { ok: true, sim: null };
        if (!r.ok) {
          setCarga((c) => (c === "pronto" ? c : "erro"));
          setErro(t.erroAtualizar);
          return { ok: false };
        }
        setSim(r.sim);
        setQtds(qtdsDe(r.sim));
        setCarga("pronto");
        // o resumo já traz todos os itens: atualiza o contador da aba sem outra consulta
        definirContagem(somarQuantidades(r.sim.itens));
        const faltam = r.sim.itens.map((i) => i.produto_id).filter((id) => !infoRef.current.has(id));
        if (faltam.length > 0) {
          void buscarInfoItens(faltam).then((novos) => {
            if (vivo.current && novos.size > 0) setInfo((a) => new Map([...a, ...novos]));
          });
        }
        return { ok: true, sim: r.sim };
      });
  }, [definirContagem]);

  // Ao abrir a aba (o carrinho pode ter mudado no catálogo ou no site), relê o resumo.
  useFocusEffect(
    useCallback(() => {
      focado.current = true;
      if (!ocupadoRef.current) {
        void recalcular(cupomRef.current).then((r) => {
          if (r.ok && vivo.current) setConcluido(null);
        });
      }
      return () => {
        focado.current = false;
      };
    }, [recalcular]),
  );

  // Voltou ao app com a aba aberta (ex.: do navegador, depois de cadastrar o endereço no site;
  // no Android o navegador do app não avisa quando fecha): relê o resumo.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && focado.current && !ocupadoRef.current) void recalcular(cupomRef.current);
    });
    return () => assinatura.remove();
  }, [recalcular]);

  async function executar(acao: () => Promise<void>) {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setPendente(true);
    try {
      await acao();
    } finally {
      ocupadoRef.current = false;
      if (vivo.current) setPendente(false);
    }
  }

  function confirmarQuantidade(item: ItemSimulacao, texto: string) {
    const n = lerQuantidade(texto.trim());
    if (n === null) {
      setErro(t.erroQuantidade);
      setQtds((a) => ({ ...a, [item.produto_id]: String(item.quantidade) }));
      return;
    }
    if (n === item.quantidade || !usuarioId) return;
    setErro(null);
    void executar(async () => {
      const r = await atualizarQuantidade(usuarioId, item.produto_id, n);
      await recalcular(cupomRef.current);
      if (!r.ok && vivo.current) setErro(r.erro === "quantidade_invalida" ? t.erroQuantidade : t.erroAtualizar);
    });
  }

  function passo(item: ItemSimulacao, delta: number) {
    const atual = lerQuantidade(qtds[item.produto_id] ?? "") ?? item.quantidade;
    const novo = limitarQuantidade(atual + delta);
    setQtds((a) => ({ ...a, [item.produto_id]: String(novo) }));
    confirmarQuantidade(item, String(novo));
  }

  function remover(item: ItemSimulacao) {
    if (!usuarioId) return;
    setErro(null);
    void executar(async () => {
      const r = await removerItem(usuarioId, item.produto_id);
      const rc = await recalcular(cupomRef.current);
      if ((!r.ok || !rc.ok) && vivo.current) setErro(t.erroAtualizar);
    });
  }

  function aplicarCupom(codigo: string | null) {
    setErro(null);
    setCupom(codigo);
    cupomRef.current = codigo;
    if (!codigo) setCupomTexto("");
    void executar(async () => {
      await recalcular(codigo);
    });
  }

  /**
   * Quantidade digitada e ainda não gravada (campo focado ao tocar em "Gerar pedido"):
   * grava e recalcula, mas NÃO gera o pedido — o cliente confere o novo total e toca de novo.
   * "nada": não havia pendência (segue para o pedido); "gravado" ou "falhou": para aqui.
   */
  async function gravarPendentes(): Promise<"nada" | "gravado" | "falhou"> {
    if (!sim || !usuarioId) return "nada";
    const pendentes = sim.itens.filter(
      (i) => i.valido && (qtds[i.produto_id] ?? String(i.quantidade)) !== String(i.quantidade),
    );
    if (pendentes.length === 0) return "nada";
    for (const item of pendentes) {
      if (lerQuantidade((qtds[item.produto_id] ?? "").trim()) === null) {
        setErro(t.erroQuantidade);
        setQtds((a) => ({ ...a, [item.produto_id]: String(item.quantidade) }));
        return "falhou";
      }
    }
    let falhou: "quantidade_invalida" | "erro" | null = null;
    for (const item of pendentes) {
      const n = lerQuantidade((qtds[item.produto_id] ?? "").trim()) as number;
      const r = await atualizarQuantidade(usuarioId, item.produto_id, n);
      if (!r.ok) {
        falhou = r.erro === "quantidade_invalida" ? "quantidade_invalida" : "erro";
        break;
      }
    }
    const rc = await recalcular(cupomRef.current);
    if (!vivo.current) return "falhou";
    if (falhou) {
      setErro(falhou === "quantidade_invalida" ? t.erroQuantidade : t.erroAtualizar);
      return "falhou";
    }
    if (rc.ok) setErro(t.quantidadesAtualizadas);
    return rc.ok ? "gravado" : "falhou";
  }

  async function gerar() {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    // fecha o teclado; o blur do campo não grava de novo (ocupadoRef já está ligado)
    Keyboard.dismiss();
    setErro(null);
    setIncerto(false);
    setEnviando(true);
    try {
      if ((await gravarPendentes()) !== "nada") return;
      const r = await gerarPedido(cupomRef.current, observacao);
      if (r.ok) {
        // e-mails do pedido em segundo plano: falha só é registrada (admin reenvia)
        notificarPedidoEmSegundoPlano(r.id);
        void atualizarContagem();
        if (!vivo.current) return;
        setConcluido(r.numero);
        setObservacao("");
        setCupom(null);
        cupomRef.current = null;
        setCupomTexto("");
        setSim((s) => (s ? { ...s, itens: [] } : s));
        return;
      }
      if (r.erro === "incerto") {
        // sem resposta: não dá para saber se o pedido foi criado. Relê o carrinho
        // (se o pedido saiu, ele está vazio) e mantém o aviso para conferir em Pedidos.
        if (vivo.current) setIncerto(true);
        await recalcular(cupomRef.current);
        if (vivo.current) setErro(null);
        void atualizarContagem();
        return;
      }
      await recalcular(cupomRef.current);
      if (!vivo.current) return;
      setErro(
        r.erro === "cupom_invalido"
          ? mensagemCupom(r.motivo ?? "", r.valorMinimo ?? null)
          : mensagemBloqueio(r.erro),
      );
    } finally {
      ocupadoRef.current = false;
      if (vivo.current) setEnviando(false);
    }
  }

  async function atualizar() {
    if (ocupadoRef.current) return;
    setAtualizando(true);
    setErro(null);
    await recalcular(cupomRef.current);
    if (vivo.current) setAtualizando(false);
  }

  if (concluido !== null) {
    return (
      <PedidoConcluido
        numero={concluido}
        onVerPedido={() => router.push({ pathname: "/pedido/[numero]", params: { numero: String(concluido), novo: "1" } })}
        onContinuar={() => {
          setConcluido(null);
          router.navigate("/");
        }}
      />
    );
  }

  if (carga === "carregando") return <Carregando />;

  if (carga === "erro" || !sim) {
    return (
      <AvisoCentral
        icone={WifiOff}
        titulo={t.erroCarregarTitulo}
        descricao={t.erroCarregar}
        acao={{
          titulo: textos.geral.tentarNovamente,
          icone: RefreshCw,
          onPress: () => {
            setCarga("carregando");
            setErro(null);
            void recalcular(cupomRef.current);
          },
        }}
        testID="carrinho-erro"
      />
    );
  }

  if (sim.itens.length === 0) {
    if (incerto) {
      return (
        <AvisoCentral
          icone={TriangleAlert}
          titulo={t.vazio}
          descricao={t.erroGerarIncerto}
          acao={{ titulo: t.irMeusPedidos, onPress: () => router.navigate("/pedidos") }}
          testID="carrinho-incerto"
        />
      );
    }
    return (
      <AvisoCentral
        icone={ShoppingCart}
        titulo={t.vazio}
        descricao={t.vazioDescricao}
        acao={{ titulo: t.irCatalogo, onPress: () => router.navigate("/") }}
        testID="carrinho-vazio"
      />
    );
  }

  const c = sim.cupom;
  let msgCupom: string | null = null;
  if (c.situacao === "aplicado") msgCupom = t.cupomAplicado(c.codigo ?? "");
  else if (c.situacao === "pior") msgCupom = t.cupomPior(c.codigo ?? "");
  else if (c.situacao === "invalido") msgCupom = mensagemCupom(c.motivo ?? "", c.valor_minimo);

  const bloqueios = sim.bloqueios.filter((b) => b !== "carrinho_vazio");
  const obsLonga = observacao.length > LIMITE_OBSERVACAO;
  const bloqueado = bloqueios.length > 0 || c.situacao === "invalido" || obsLonga;
  const ocupado = pendente || enviando;
  const totalItens = somarQuantidades(sim.itens);
  const rotuloDesconto = sim.desconto_origem === "cupom" ? t.descontoCupom(c.codigo ?? "") : t.descontoCliente;

  return (
    <ScrollView
      style={estilos.tela}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void atualizar()}
          colors={[cores.preto]}
          tintColor={cores.preto}
        />
      }
      testID="tela-carrinho"
      accessibilityState={{ busy: ocupado }}
    >
      <Text style={estilos.contagem}>{t.itens(totalItens)}</Text>

      {sim.itens.map((item) => (
        <ItemCarrinho
          key={item.produto_id}
          item={item}
          info={info.get(item.produto_id)}
          texto={qtds[item.produto_id] ?? String(item.quantidade)}
          ocupado={ocupado}
          onTexto={(v) => setQtds((a) => ({ ...a, [item.produto_id]: v }))}
          onConfirmar={() => confirmarQuantidade(item, qtds[item.produto_id] ?? "")}
          onPasso={(d) => passo(item, d)}
          onRemover={() => remover(item)}
          onAbrir={(slug) => router.push({ pathname: "/produto/[slug]", params: { slug } })}
        />
      ))}

      <View style={estilos.cartao}>
        <View style={estilos.linhaCupom}>
          <Campo
            rotulo={t.cupom}
            icone={Tag}
            value={cupomTexto}
            onChangeText={setCupomTexto}
            onSubmitEditing={() => aplicarCupom(cupomTexto.trim() || null)}
            placeholder={t.cupomPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={64}
            returnKeyType="done"
            editable={!ocupado}
            estiloContainer={estilos.campoCupom}
            testID="campo-cupom"
          />
          <Botao
            titulo={t.aplicar}
            variante="contorno"
            onPress={() => aplicarCupom(cupomTexto.trim() || null)}
            desabilitado={ocupado || !cupomTexto.trim()}
            larguraTotal={false}
            style={estilos.botaoAplicar}
            testID="aplicar-cupom"
          />
        </View>
        {msgCupom || cupom ? (
          <View style={estilos.mensagemCupom} accessibilityLiveRegion="polite">
            {msgCupom ? (
              <Text
                style={[estilos.textoCupom, c.situacao === "invalido" && estilos.textoAlerta]}
                testID="mensagem-cupom"
              >
                {msgCupom}
              </Text>
            ) : null}
            {cupom ? (
              <Pressable
                onPress={() => aplicarCupom(null)}
                disabled={ocupado}
                accessibilityRole="button"
                hitSlop={8}
                style={estilos.link}
                testID="tirar-cupom"
              >
                <Text style={estilos.linkTexto}>{t.tirarCupom}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={estilos.divisor} />

        <Campo
          rotulo={t.observacao}
          value={observacao}
          onChangeText={setObservacao}
          placeholder={t.observacaoPlaceholder}
          multiline
          numberOfLines={3}
          maxLength={LIMITE_OBSERVACAO}
          textAlignVertical="top"
          accessibilityHint={t.observacaoAjuda}
          editable={!enviando}
          testID="campo-observacao"
        />
        <View style={estilos.ajudaObs}>
          <Text style={estilos.ajudaTexto}>{t.observacaoAjuda}</Text>
          <Text style={estilos.ajudaTexto}>
            {observacao.length}/{LIMITE_OBSERVACAO}
          </Text>
        </View>
      </View>

      <View style={estilos.cartao} testID="resumo">
        <Text style={estilos.tituloResumo} accessibilityRole="header">
          {t.resumo}
        </Text>
        <LinhaResumo rotulo={t.subtotal} valor={formatarMoeda(sim.subtotal)} />
        {sim.desconto_aplicado > 0 ? (
          <LinhaResumo
            rotulo={rotuloDesconto}
            valor={`−${formatarMoeda(sim.desconto_aplicado)}`}
            testID="linha-desconto"
          />
        ) : null}
        <LinhaResumo rotulo={t.frete} valor="—" a11y={t.freteA11y} />
        <View style={estilos.linhaTotal} testID="total" accessible accessibilityLabel={`${t.total}: ${formatarMoeda(sim.total)}`}>
          <Text style={estilos.total}>{t.total}</Text>
          <Text style={estilos.totalValor}>{formatarMoeda(sim.total)}</Text>
        </View>

        {bloqueios.length > 0 ? (
          <View style={estilos.bloqueios} testID="bloqueios">
            {bloqueios.map((b) => (
              <View key={b} style={estilos.bloqueio}>
                <TriangleAlert size={16} color={cores.preto} strokeWidth={2} />
                <View style={estilos.bloqueioCorpo}>
                  <Text style={estilos.bloqueioTexto}>{mensagemBloqueio(b)}</Text>
                  {b === "sem_endereco" ? (
                    <Pressable
                      onPress={() =>
                        void abrirPaginaDoSite(CAMINHO_ENDERECO).then(() => recalcular(cupomRef.current))
                      }
                      accessibilityRole="link"
                      hitSlop={8}
                      style={[estilos.link, estilos.linkEndereco]}
                      testID="cadastrar-endereco"
                    >
                      <MapPin size={14} color={cores.preto} strokeWidth={2} />
                      <Text style={estilos.linkTexto}>{t.cadastrarEndereco}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {incerto || erro ? (
          <View style={estilos.alerta} accessibilityLiveRegion="assertive" accessibilityRole="alert" testID="erro-carrinho">
            <Text style={estilos.alertaTexto}>{incerto ? t.erroGerarIncerto : erro}</Text>
            {incerto ? (
              <Pressable
                onPress={() => router.navigate("/pedidos")}
                accessibilityRole="link"
                hitSlop={8}
                style={estilos.link}
              >
                <Text style={estilos.linkTexto}>{t.irMeusPedidos}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Botao
          titulo={enviando ? t.gerando : t.gerar}
          iconeDireita={enviando ? undefined : ArrowRight}
          onPress={() => void gerar()}
          carregando={enviando}
          desabilitado={bloqueado || ocupado}
          testID="gerar-pedido"
        />
        <Text style={estilos.aviso}>{t.aviso}</Text>
      </View>
    </ScrollView>
  );
}

function ItemCarrinho({
  item,
  info,
  texto,
  ocupado,
  onTexto,
  onConfirmar,
  onPasso,
  onRemover,
  onAbrir,
}: {
  item: ItemSimulacao;
  info: InfoItem | undefined;
  texto: string;
  ocupado: boolean;
  onTexto: (v: string) => void;
  onConfirmar: () => void;
  onPasso: (delta: number) => void;
  onRemover: () => void;
  onAbrir: (slug: string) => void;
}) {
  const slug = info?.slug;
  const valorAtual = lerQuantidade(texto) ?? item.quantidade;
  return (
    <View style={estilos.cartao} testID="item-carrinho">
      <View style={estilos.itemTopo}>
        <Pressable
          onPress={slug ? () => onAbrir(slug) : undefined}
          disabled={!slug}
          accessibilityRole={slug ? "link" : undefined}
          accessibilityLabel={slug ? textos.catalogo.abrirProduto(item.nome) : undefined}
          style={estilos.itemInfo}
        >
          <Miniatura url={info?.imagem ?? null} />
          <View style={estilos.itemTextos}>
            <Selo texto={item.codigo} formato="etiqueta" variante="escuro" />
            <Text style={estilos.itemNome} numberOfLines={2}>
              {item.nome}
            </Text>
            {item.valido ? (
              <Text style={estilos.itemUnitario}>
                {t.precoUnitario}: {formatarMoeda(item.preco_unitario ?? 0)}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={onRemover}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityLabel={t.removerDe(item.nome)}
          accessibilityState={{ disabled: ocupado }}
          style={({ pressed }) => [estilos.remover, pressed && estilos.removerPressionado]}
          testID={`remover-${item.produto_id}`}
        >
          <Trash2 size={19} color={ocupado ? cores.cinza300 : cores.cinza600} strokeWidth={1.9} />
        </Pressable>
      </View>

      {item.valido ? (
        <View style={estilos.itemRodape}>
          <Stepper
            valor={valorAtual}
            onPasso={onPasso}
            desabilitado={ocupado}
            editavel
            texto={texto}
            onTexto={onTexto}
            onConfirmar={onConfirmar}
            rotulo={t.quantidadeDe(item.nome)}
            idTeste={item.produto_id}
          />
          <View style={estilos.itemTotal}>
            <Text style={estilos.itemTotalRotulo}>{t.totalLinha}</Text>
            <Text style={estilos.itemTotalValor} testID={`total-${item.produto_id}`}>
              {formatarMoeda(item.total_linha)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={estilos.itemInvalido} testID={`item-invalido-${item.produto_id}`}>
          <TriangleAlert size={15} color={cores.erro} strokeWidth={2} />
          <Text style={estilos.itemInvalidoTexto}>
            {item.motivo === "sem_preco" ? t.itemSemPreco : t.itemInativo}
          </Text>
        </View>
      )}
    </View>
  );
}

function Miniatura({ url }: { url: string | null }) {
  const [falhou, setFalhou] = useState(false);
  if (!url || falhou) {
    return (
      <View style={[estilos.miniatura, estilos.semImagem]} accessibilityLabel={t.semImagem}>
        <ImageOff size={20} color={cores.cinza400} strokeWidth={1.6} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={estilos.miniatura}
      contentFit="contain"
      transition={120}
      accessible={false}
      onError={() => setFalhou(true)}
    />
  );
}

function LinhaResumo({ rotulo, valor, a11y, testID }: { rotulo: string; valor: string; a11y?: string; testID?: string }) {
  return (
    <View style={estilos.linhaResumo} accessible accessibilityLabel={a11y ?? `${rotulo}: ${valor}`} testID={testID}>
      <Text style={estilos.resumoRotulo}>{rotulo}</Text>
      <Text style={estilos.resumoValor}>{valor}</Text>
    </View>
  );
}

function PedidoConcluido({
  numero,
  onVerPedido,
  onContinuar,
}: {
  numero: number;
  onVerPedido: () => void;
  onContinuar: () => void;
}) {
  return (
    <View style={estilos.concluido} testID="pedido-concluido">
      <View style={estilos.concluidoCartao}>
        <View style={estilos.concluidoIcone}>
          <CircleCheck size={34} color={cores.branco} strokeWidth={1.8} />
        </View>
        <Text style={estilos.concluidoTitulo} accessibilityRole="header">
          {textos.pedidoConcluido.titulo}
        </Text>
        <Text style={estilos.concluidoNumero} testID="numero-pedido">
          {textos.pedidoConcluido.numero(numero)}
        </Text>
        <Text style={estilos.concluidoDescricao}>{textos.pedidoConcluido.descricao}</Text>
        <View style={estilos.concluidoAcoes}>
          <Botao titulo={textos.pedidoConcluido.verPedido} icone={Package} onPress={onVerPedido} testID="ver-pedido" />
          <Botao
            titulo={textos.pedidoConcluido.continuarComprando}
            variante="contorno"
            onPress={onContinuar}
            testID="continuar-comprando"
          />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espacos.lg, paddingBottom: espacos.xxxl, gap: espacos.md },
  contagem: { fontSize: fontes.tamanho.pequeno, color: cores.textoFraco, fontWeight: fontes.peso.medio },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    padding: espacos.lg,
    gap: espacos.md,
    ...sombras.cartao,
  },
  itemTopo: { flexDirection: "row", alignItems: "flex-start", gap: espacos.sm },
  itemInfo: { flex: 1, flexDirection: "row", gap: espacos.md },
  itemTextos: { flex: 1, gap: espacos.xs },
  itemNome: {
    fontSize: fontes.tamanho.corpo,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    lineHeight: 20,
  },
  itemUnitario: { fontSize: fontes.tamanho.pequeno, color: cores.textoSuave },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza50,
  },
  semImagem: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cores.borda },
  remover: {
    width: ALVO_MINIMO,
    height: ALVO_MINIMO,
    marginTop: -espacos.sm,
    marginRight: -espacos.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raios.pill,
  },
  removerPressionado: { backgroundColor: cores.cinza100 },
  itemRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacos.md,
    paddingTop: espacos.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  itemTotal: { alignItems: "flex-end", flexShrink: 1 },
  itemTotalRotulo: { fontSize: fontes.tamanho.legenda, color: cores.textoFraco },
  itemTotalValor: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  itemInvalido: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacos.sm,
    padding: espacos.md,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.erroFundo,
  },
  itemInvalidoTexto: { flex: 1, fontSize: fontes.tamanho.pequeno, color: cores.erro, fontWeight: fontes.peso.medio },
  linhaCupom: { flexDirection: "row", alignItems: "flex-end", gap: espacos.sm },
  campoCupom: { flex: 1 },
  botaoAplicar: { minHeight: 52, paddingHorizontal: espacos.lg },
  mensagemCupom: { gap: espacos.xs },
  textoCupom: { fontSize: fontes.tamanho.pequeno, color: cores.cinza800, lineHeight: 18 },
  textoAlerta: { color: cores.erro },
  link: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  linkEndereco: { flexDirection: "row", alignItems: "center", gap: espacos.xs },
  linkTexto: {
    fontSize: fontes.tamanho.pequeno,
    fontWeight: fontes.peso.semibold,
    color: cores.preto,
    textDecorationLine: "underline",
  },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: cores.borda },
  ajudaObs: { flexDirection: "row", justifyContent: "space-between", gap: espacos.md, marginTop: -espacos.xs },
  ajudaTexto: { fontSize: fontes.tamanho.legenda, color: cores.textoFraco },
  tituloResumo: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
  },
  linhaResumo: { flexDirection: "row", justifyContent: "space-between", gap: espacos.md },
  resumoRotulo: { flex: 1, fontSize: fontes.tamanho.corpo - 1, color: cores.textoSuave },
  resumoValor: { fontSize: fontes.tamanho.corpo - 1, color: cores.cinza800, fontVariant: ["tabular-nums"] },
  linhaTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: espacos.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  total: { fontSize: fontes.tamanho.destaque, fontWeight: fontes.peso.negrito, color: cores.texto },
  totalValor: {
    fontSize: fontes.tamanho.subtitulo + 2,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  bloqueios: {
    gap: espacos.sm,
    paddingLeft: espacos.md,
    borderLeftWidth: 2,
    borderLeftColor: cores.preto,
  },
  bloqueio: { flexDirection: "row", gap: espacos.sm },
  bloqueioCorpo: { flex: 1, gap: espacos.xs },
  bloqueioTexto: { fontSize: fontes.tamanho.pequeno + 1, color: cores.texto, lineHeight: 19 },
  alerta: {
    gap: espacos.xs,
    padding: espacos.md,
    borderRadius: raios.cartaoPequeno,
    backgroundColor: cores.cinza100,
    borderWidth: 1,
    borderColor: cores.cinza300,
  },
  alertaTexto: { fontSize: fontes.tamanho.pequeno + 1, color: cores.texto, lineHeight: 19 },
  aviso: { fontSize: fontes.tamanho.legenda, color: cores.textoFraco, textAlign: "center", lineHeight: 17 },
  concluido: { flex: 1, justifyContent: "center", padding: espacos.xl, backgroundColor: cores.fundo },
  concluidoCartao: {
    alignItems: "center",
    gap: espacos.md,
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    paddingHorizontal: espacos.xl,
    paddingVertical: espacos.xxl,
    ...sombras.cartao,
  },
  concluidoIcone: {
    width: 72,
    height: 72,
    borderRadius: raios.pill,
    backgroundColor: cores.preto,
    alignItems: "center",
    justifyContent: "center",
  },
  concluidoTitulo: {
    fontSize: fontes.tamanho.titulo - 2,
    fontWeight: fontes.peso.negrito,
    color: cores.texto,
    letterSpacing: -0.5,
  },
  concluidoNumero: {
    fontSize: fontes.tamanho.destaque,
    fontWeight: fontes.peso.semibold,
    color: cores.texto,
    fontVariant: ["tabular-nums"],
  },
  concluidoDescricao: {
    fontSize: fontes.tamanho.corpo,
    color: cores.textoSuave,
    textAlign: "center",
    lineHeight: 22,
  },
  concluidoAcoes: { alignSelf: "stretch", gap: espacos.sm, marginTop: espacos.sm },
});
