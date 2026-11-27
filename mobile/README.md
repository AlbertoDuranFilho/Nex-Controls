# App Nex Controls (Android)

App do cliente B2B da Nex, em Expo (SDK 58) + expo-router. Usa o **mesmo Supabase do site**
(mesmo login, mesmas tabelas/RPCs, sob RLS). Nunca usa a service role. Um pedido feito no app
aparece no site e no admin.

## Variáveis de ambiente

Só chaves públicas (ficam dentro do app):

| Variável | O que é |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (a mesma do site, `NEXT_PUBLIC_SUPABASE_URL`) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publishable (`sb_publishable_...`); em projeto antigo, use `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_SITE_URL` | origem do site, sem barra final (ex.: `https://www.nexcontrols.com`) |

`EXPO_PUBLIC_SITE_URL` é usada para avisar o site de um pedido novo
(`POST /api/app/pedidos/{id}/notificar`, que envia os mesmos e-mails do pedido feito no site)
e para abrir páginas do site (política de privacidade, exclusão de conta, Área do Cliente).

**Use o host `www`:** `EXPO_PUBLIC_SITE_URL=https://www.nexcontrols.com`. Ele responde a `/api`
direto; `https://nexcontrols.com` redireciona (307) para o `www`, e no redirect o Android descarta o
cabeçalho `Authorization` — a rota responde 401 e os e-mails do pedido não saem (o pedido é criado
igual, sem aviso ao cliente). Qualquer outro host precisa responder sem redirect.

Se uma build sair sem as variáveis, o app abre numa tela "App sem configuração" em vez de fechar.

## Rodar no celular

```bash
cd mobile
cp .env.example .env   # preencha as três variáveis acima
npm install
npx expo start         # QR code para o Expo Go; tecla "a" abre no emulador Android
```

- **Expo Go** (mais rápido): instale o Expo Go no Android e leia o QR code. Precisa ser o
  Expo Go do SDK 58.
- **Dev build** (igual ao app final, com o nome e ícone da Nex): gere uma vez com
  `eas build -p android --profile development`, instale o `.apk` e rode `npx expo start`
  (o app de desenvolvimento se conecta ao Metro).
- Para testar contra o Supabase local (`npx supabase start` na raiz), use o IP da sua
  máquina na rede (não `127.0.0.1`) em `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SITE_URL`.

## Verificar

```bash
npx tsc --noEmit && npx expo lint && npx jest
npx expo export --platform android   # confere que o bundle compila, sem aparelho
```

Os testes leem `../web/messages/pt.json` para garantir que as mensagens do carrinho e dos
pedidos são as mesmas do site. Por isso os testes do app precisam do checkout do monorepo
inteiro (a pasta `web/` ao lado de `mobile/`), inclusive no CI.

## Gerar o `.aab` para a Google Play (EAS)

Perfis em `eas.json`:

- `development`: dev build (`.apk`, com `expo-dev-client`), distribuição interna.
- `preview`: `.apk` de teste para instalar direto no aparelho.
- `production`: `.aab` (Android App Bundle) para a Play, com `versionCode` incrementado
  automaticamente pelo EAS (`appVersionSource: remote`).

```bash
npm install -g eas-cli
eas login                       # conta Expo da Nex
eas init                        # só na primeira vez: liga o projeto e grava o projectId no app.json
# o .env não vai para o build (está no .gitignore): cadastre as variáveis no EAS
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<projeto>.supabase.co" --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..." --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SITE_URL --value "https://www.nexcontrols.com" --visibility plaintext
eas build -p android --profile production
```

O EAS cria e guarda a chave de assinatura (upload key) na primeira build. Repita o
`eas env:create` com `--environment preview`/`development` para os outros perfis.

Envio para a Play:

1. **O primeiro `.aab` é enviado à mão** na Play Console (crie o app, depois Teste interno →
   Criar versão → envie o arquivo baixado do EAS). A API da Play recusa envios antes disso.
2. Depois, para usar `eas submit -p android --profile production`, crie uma conta de serviço do
   Google Cloud com acesso à Play Console, baixe a chave JSON (não versione) e aponte para ela em
   `submit.production.android` do `eas.json` (`"serviceAccountKeyPath"` e, por exemplo,
   `"track": "internal"`), ou envie a chave pelo `eas credentials`.

Checklist da Play:

- Política de privacidade: `https://www.nexcontrols.com/pt/privacy-policy`.
- **Data deletion URL** (exclusão de conta): `https://www.nexcontrols.com/pt/excluir-conta`.
- Exclusão dentro do app: aba Conta → "Excluir minha conta" (abre a mensagem para a Nex e
  mostra o link para a página acima).

## Estrutura

- `app/_layout.tsx` — provedores (sessão, contador do carrinho) e pilha raiz.
- `app/(abas)/` — Catálogo (público), Carrinho, Pedidos e Conta (pedem login).
  - `carrinho.tsx` — itens com miniatura, quantidade e remover; cupom; observação; resumo
    via `simular_pedido`; bloqueios com as mensagens do site; "Gerar pedido" (`criar_pedido`),
    aviso ao site em segundo plano e tela de sucesso.
  - `pedidos.tsx` — lista de pedidos com o status em cores (mesmos tons do site).
  - `conta.tsx` — dados e endereço (só leitura; edição no site), Fale conosco, política de
    privacidade, pedido de exclusão de conta e Sair.
- `app/pedido/[numero].tsx` — detalhe: itens, totais, entrega, linha do tempo e nota fiscal
  (DANFE, só link `https`).
- `app/produto/[slug].tsx` — produto, com "Solicitar orçamento" quando não há preço.
- `app/login.tsx` — login com o e-mail e senha do site. Conta de admin é desconectada
  ("Use o painel no site").
- `lib/supabase.ts` — cliente Supabase; sessão guardada no `expo-secure-store` em pedaços
  (`lib/armazenamento.ts`), refresh automático ligado ao estado do app.
- `lib/sessao.tsx` — `useSessao()`: sessão, papel (`visitante` | `lojista` | `admin` | `erro`),
  `lojistaAtivo`, `entrar`, `sair`.
- `lib/carrinho.ts`, `lib/pedidos.ts`, `lib/conta.ts` — mesmas consultas/RPCs do site. Toda
  consulta a `pedidos`, `carrinho_itens` e `lojistas` filtra também pelo id do usuário.
- `lib/mensagens-carrinho.ts` — mensagens de cupom e bloqueio (iguais a `web/lib/carrinho/mensagens.ts`).
- `lib/contato.ts` e `constants/contato.ts` — e-mail e WhatsApp da Nex. O site ainda não
  publica um WhatsApp; com `whatsapp: null` o app usa o e-mail `contato@nexcontrols.com`.
  Preencha o número (só dígitos, com DDI) quando houver.
- `lib/contagem-carrinho.tsx` — `useContagemCarrinho()`: contador da aba Carrinho.
- `constants/tema.ts` e `constants/textos.ts` — paleta preta/branca e todos os textos (pt-BR).
- `components/ui/` — `Botao`, `Campo`, `CampoSenha`, `Selo`, `Faixa`.
- `types/database.ts` — cópia dos tipos gerados do banco (`web/types/database.ts`);
  atualize junto quando rodar `npm run db:types` na raiz.

## Identidade do app

`app.json`: nome "Nex Controls", pacote Android `br.com.nexcontrols.app`, scheme `nexcontrols`,
ícone e splash a partir de `assets/images/logo.png` sobre fundo branco.
