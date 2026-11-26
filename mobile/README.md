# App Nex Controls (Android)

App do cliente B2B da Nex, em Expo (SDK 58) + expo-router. Usa o **mesmo Supabase do site**
(mesmo login, mesmas tabelas/RPCs, sob RLS). Nunca usa a service role.

## Rodar

```bash
cd mobile
cp .env.example .env   # preencha URL e chave publishable do Supabase
npm install
npx expo start         # abra no Expo Go ou num dev build (tecla "a" para Android)
```

Variáveis (só públicas): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(ou `EXPO_PUBLIC_SUPABASE_ANON_KEY`) e `EXPO_PUBLIC_SITE_URL`.

## Verificar

```bash
npx tsc --noEmit && npx expo lint && npx jest
npx expo export --platform android   # confere que o bundle compila, sem aparelho
```

## Estrutura

- `app/_layout.tsx` — provedores (sessão, contador do carrinho) e pilha raiz.
- `app/(abas)/` — abas Catálogo (público), Carrinho, Pedidos e Conta (pedem login).
- `app/login.tsx` — login com o e-mail e senha do site. Conta de admin é desconectada
  ("Use o painel no site").
- `lib/supabase.ts` — cliente Supabase; sessão guardada no `expo-secure-store` em pedaços
  (`lib/armazenamento.ts`), refresh automático ligado ao estado do app.
- `lib/sessao.tsx` — `useSessao()`: sessão, papel (`visitante` | `lojista` | `admin`),
  `lojistaAtivo`, `entrar`, `sair`.
- `lib/contagem-carrinho.tsx` — `useContagemCarrinho()`: contador da aba Carrinho.
- `constants/tema.ts` e `constants/textos.ts` — paleta preta/branca e todos os textos (pt-BR).
- `components/ui/` — `Botao`, `Campo`, `CampoSenha`, `Selo`.
- `types/database.ts` — cópia dos tipos gerados do banco (`web/types/database.ts`);
  atualize junto quando rodar `npm run db:types` na raiz.

## Identidade do app

`app.json`: nome "Nex Controls", pacote Android `br.com.nexcontrols.app`, scheme `nexcontrols`,
ícone e splash a partir de `assets/images/logo.png` sobre fundo branco.
