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

## Webhook — formatos suportados

O endpoint `/api/public/stripe/webhook` aceita **os dois formatos** emitidos
pelo Stripe e roteia ambos pelo mesmo pipeline (mesma dedup, mesmas regras
de negócio):

- **Snapshot events (API v1 clássica)** — payload traz o objeto inteiro em
  `data.object`. Verificado via `stripe.webhooks.constructEventAsync`.
- **Thin event notifications (API v2 / Event Destinations)** — payload traz
  apenas `id`, `type` e `related_object`. Verificado via
  `stripe.parseEventNotificationAsync` e o objeto real é buscado sob demanda
  com `fetchRelatedObject()`.

A detecção é automática (`object === "v2.core.event"` ⇒ thin). Não há mais
dependência exclusiva do formato Snapshot legado.

Idempotência: o `id` do evento (único nos dois formatos) é gravado em
`stripe_webhook_event`; reentregas retornam `duplicate: true` sem
reprocessar.

## Eventos a cadastrar no Dashboard do Stripe

Cadastre exatamente esta lista no destino (Workbench → Webhooks ou
Event Destinations). Vale para os dois formatos — em Event Destinations
(thin), selecione as versões `v1.*` correspondentes; em Webhooks clássicos
(snapshot), selecione os nomes sem prefixo.

| Evento (snapshot)                     | Evento (thin)                            |
|---------------------------------------|------------------------------------------|
| `checkout.session.completed`          | `v1.checkout.session.completed`          |
| `customer.created`                    | `v1.customer.created`                    |
| `customer.updated`                    | `v1.customer.updated`                    |
| `customer.subscription.created`       | `v1.customer.subscription.created`       |
| `customer.subscription.updated`       | `v1.customer.subscription.updated`       |
| `customer.subscription.deleted`       | `v1.customer.subscription.deleted`       |
| `invoice.paid`                        | `v1.invoice.paid`                        |
| `invoice.payment_failed`              | `v1.invoice.payment_failed`              |

**Não** cadastre o mesmo evento em Webhook clássico **e** Event Destination
apontando para a mesma URL — o Stripe entregará duas vezes com `id`
diferentes e o dedup por id não filtra duplicatas cruzadas. Escolha um
formato por endpoint.

URL: `https://barbeiropro.app/api/public/stripe/webhook`
Secret: `STRIPE_WEBHOOK_SECRET`

## O que ficará para as próximas etapas

1. Server functions: `createCheckoutSession`, `createBillingPortalSession`.
2. UI de checkout conectada em `/app/checkout` e na landing.
3. Sincronização de `company.status_cobranca` a partir de eventos Stripe.
4. Provisionamento dos produtos/prices via script ou no dashboard Stripe.
