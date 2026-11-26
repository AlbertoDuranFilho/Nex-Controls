// Todos os textos do app (só português nesta fase). Telas não escrevem frases soltas.

export const textos = {
  marca: {
    nome: "Nex Controls",
    descricaoLogo: "Nex Controls do Brasil",
  },
  geral: {
    carregando: "Carregando…",
    tentarNovamente: "Tentar novamente",
    voltar: "Voltar",
    fechar: "Fechar",
    erroGenerico: "Algo deu errado. Tente novamente.",
    semConexao: "Sem conexão com a internet. Verifique e tente novamente.",
    paginaNaoEncontrada: "Página não encontrada",
    irParaCatalogo: "Ir para o catálogo",
  },
  abas: {
    catalogo: "Catálogo",
    carrinho: "Carrinho",
    pedidos: "Pedidos",
    conta: "Conta",
    itensNoCarrinho: (n: number) => (n === 1 ? "1 item no carrinho" : `${n} itens no carrinho`),
  },
  login: {
    titulo: "Área do Cliente",
    subtitulo: "Entre com o mesmo e-mail e senha do site.",
    email: "E-mail",
    emailPlaceholder: "voce@empresa.com.br",
    senha: "Senha",
    senhaPlaceholder: "Sua senha",
    entrar: "Entrar",
    entrando: "Entrando…",
    mostrarSenha: "Mostrar senha",
    ocultarSenha: "Ocultar senha",
    voltarAoCatalogo: "Continuar sem entrar",
    erroCredenciais: "E-mail ou senha inválidos.",
    erroEmailNaoConfirmado: "Confirme seu e-mail antes de entrar.",
    erroMuitasTentativas: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    erroCamposVazios: "Informe e-mail e senha.",
    adminTitulo: "Use o painel no site",
    adminMensagem:
      "Esta conta é de administrador. O painel administrativo fica só no site; o app é para clientes.",
    semCadastro: "Ainda não é cliente? Fale com a Nex pelo site para criar seu cadastro.",
  },
  sessao: {
    entreParaContinuar: "Entre para continuar",
    entreDescricao: "Faça login com sua conta de cliente para ver seu carrinho, pedidos e dados.",
    entrar: "Entrar",
    cadastroInativoTitulo: "Cadastro inativo",
    cadastroInativo: "Seu cadastro está inativo. Fale com a Nex para reativar.",
    sair: "Sair",
  },
  catalogo: {
    titulo: "Catálogo",
    entreParaVerPrecos: "Entre para ver preços",
    sobConsulta: "Sob consulta",
    emBreve: "Os produtos aparecem aqui em breve.",
  },
  carrinho: {
    titulo: "Carrinho",
    emBreve: "Seu carrinho aparece aqui em breve.",
  },
  pedidos: {
    titulo: "Pedidos",
    emBreve: "Seus pedidos aparecem aqui em breve.",
  },
  conta: {
    titulo: "Conta",
    conectadoComo: "Conectado como",
  },
  configuracao: {
    faltaAmbiente:
      "Configuração ausente: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.",
  },
} as const;
