# Integração Stripe — BarbeiroPro

Esta pasta contém **apenas a infraestrutura** para a futura integração com
Stripe. Nenhum fluxo de cobrança, checkout, portal ou webhook está ativo
ainda.

## Estrutura

```
src/lib/stripe/
├── config.ts            # leitura de env vars (STRIPE_SECRET_KEY, etc.)
├── plans.ts             # definição dos planos (Starter/Pro/Elite) + mapeamento IDs
├── types.ts             # tipagens internas (AppSubscription, WebhookEvent, ...)
├── helpers.ts           # utilitários puros (plan ↔ price/product, status, metadata)
├── client.server.ts     # instância do Stripe SDK (server-only)
├── client.browser.ts    # loader do Stripe.js (browser)
├── index.ts             # export barrel (sem client.server)
└── README.md
```

## Planos

| Slug     | Nome    | Preço       | Interval | Trial   |
|----------|---------|-------------|----------|---------|
| starter  | Starter | R$ 97,00    | mensal   | 14 dias |
| pro      | Pro     | R$ 297,00   | mensal   | 14 dias |
| elite    | Elite   | R$ 497,00   | mensal   | 14 dias |

## Variáveis de ambiente esperadas (ainda não configuradas)

Server-side (Lovable Cloud secrets):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRODUCT_STARTER`, `STRIPE_PRODUCT_PRO`, `STRIPE_PRODUCT_ELITE`
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`
- `STRIPE_CHECKOUT_SUCCESS_URL`
- `STRIPE_CHECKOUT_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

Client-side (opcional, para Stripe.js):

- `VITE_STRIPE_PUBLISHABLE_KEY`

## O que já está pronto

- Cliente Stripe SDK (server) com cache e leitura preguiçosa da secret.
- Cliente Stripe.js (browser) via `loadStripe`.
- Mapeamento **plano ↔ produto ↔ price** (troca de IDs sem tocar código).
- Tipagens completas para Customer, Subscription, Checkout Session, Portal e Webhook.
- Lista de eventos de webhook que serão tratados (`HANDLED_WEBHOOK_EVENTS`).
- Helpers para converter Stripe → domínio interno e montar metadata padrão.

## O que ficará para as próximas etapas

1. Migration do banco: tabelas `stripe_customer`, `subscription`,
   `stripe_webhook_event`.
2. Server functions: `createCheckoutSession`, `createBillingPortalSession`,
   `syncSubscriptionFromStripe`.
3. Rota pública `/api/public/stripe/webhook` com verificação HMAC.
4. UI de checkout conectada em `/app/checkout` e na landing.
5. Sincronização de `company.status_cobranca` a partir de eventos Stripe.
6. Provisionamento dos produtos/prices via script ou no dashboard Stripe.
