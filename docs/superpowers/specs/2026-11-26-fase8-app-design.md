# Fase 8 — App Android da Nex (design)

## Intenção
O cliente B2B da Nex faz tudo pelo celular, sem sair do app: vê o catálogo com o seu preço, monta o carrinho, aplica cupom, gera o pedido e acompanha pedidos e notas. Mesmo login, mesmo banco e mesmas regras do site: um pedido feito no app aparece no site e no admin. Publicação na Google Play (conta de empresa). iPhone depois.

## Decisões do usuário (2026-11-26)
- Tudo dentro do app; **nada de abrir o navegador** para gerar pedido.
- Manter o design dos cartões de produto do app atual (`mobile/components/ProductCard.tsx`: cartão horizontal branco, cantos 12, imagem 80×80 arredondada à esquerda, nome em negrito, código em etiqueta escura, linha de descrição cinza). O resto pode ser reformulado, contanto que fique bonito.
- Paleta da marca: preto e branco premium (mesma do site). A etiqueta do código passa do azul antigo `#1B1C59` para preto.
- Admin fica só no site.

## Calls do Claude (corrigíveis)
- **Visitante sem login vê o catálogo sem preço** ("Entre para ver preços"), como no site — a revisão da Google Play consegue ver conteúdo e o app serve de vitrine. Custo se errado: abrir direto no login (pequeno).
- **Pedido:** o app chama `criar_pedido` direto no Supabase (RLS, mesmo do site). Em seguida chama, em segundo plano, `POST {SITE}/api/app/pedidos/{id}/notificar` com o token do usuário; o site confere que o pedido é dele e ainda não foi notificado e envia os mesmos e-mails (`notificarPedido`). Se o aviso falhar, o pedido existe igual e o admin tem "reenviar e-mails".
- Expo na versão SDK estável mais recente (exigência de API level da Google Play); `@supabase/supabase-js` com sessão em `expo-secure-store`; ícones `lucide-react-native`.
- Abas: Catálogo, Carrinho (com contador), Pedidos, Conta. Pedidos/Carrinho/Conta pedem login.
- Conta: ver dados e endereço (edição só no site nesta fase), política de privacidade, "Fale conosco"/WhatsApp, pedir exclusão de conta (link para contato — exigência da Play quando há conta), sair.
- Pagamento online fica para quando a integração Pagar.me/Stone existir no site.

## Não-objetivos
Admin no app, cadastro de cliente pelo app, push notifications, iOS, pagamento nesta fase.

## Abordagens consideradas
1. **App fala direto com o Supabase + rota do site só para e-mail** (escolhida): reaproveita RLS e RPCs; só uma rota nova no site.
2. Tudo via API do site: duplicaria cada operação como rota HTTP.
3. E-mails por Edge Function do Supabase: duplicaria os modelos de e-mail que já estão no site.
