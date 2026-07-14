/**
 * Processamento centralizado dos eventos de webhook do Stripe.
 *
 * Server-only. Usa exclusivamente a camada de repositório criada na
 * etapa anterior — não acessa o banco diretamente.
 */
import type Stripe from "stripe";
import { getStripe } from "./client.server";
import { readStripeServerConfig } from "./config";
import {
  findStripeCustomerByStripeId,
  markWebhookProcessed,
  recordWebhookEvent,
  subscriptionFromStripe,
  syncSubscription,
  updateSubscriptionStatus,
  upsertStripeCustomer,
} from "./repository.server";

/** Eventos que este handler processa ativamente. */
const HANDLED = new Set<string>([
  "checkout.session.completed",
  "customer.created",
  "customer.updated",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Valida assinatura HMAC do Stripe, registra o evento, garante idempotência,
 * dispatch por tipo e marca sucesso/erro na tabela stripe_webhook_event.
 *
 * Nunca lança — sempre devolve um WebhookResult apropriado para a resposta HTTP.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<WebhookResult> {
  const { webhookSecret } = readStripeServerConfig();
  if (!webhookSecret) {
    return { status: 500, body: { ok: false, error: "STRIPE_WEBHOOK_SECRET não configurado" } };
  }
  if (!signatureHeader) {
    return { status: 400, body: { ok: false, error: "assinatura ausente" } };
  }

  // 1) Validação de assinatura HMAC — obrigatório usar constructEventAsync no runtime Workers.
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = await stripe.webhooks.constructEventAsync(rawBody, signatureHeader, webhookSecret);
  } catch (err: any) {
    return {
      status: 400,
      body: { ok: false, error: `assinatura inválida: ${err?.message ?? String(err)}` },
    };
  }

  // 2) Registro + idempotência
  let duplicate = false;
  try {
    const rec = await recordWebhookEvent({
      stripeEventId: event.id,
      type: event.type,
      apiVersion: event.api_version ?? null,
      payload: event as unknown,
    });
    duplicate = rec.duplicate;
  } catch (err: any) {
    // erro inesperado de persistência
    return { status: 500, body: { ok: false, error: `falha ao registrar evento: ${err?.message ?? err}` } };
  }

  if (duplicate) {
    return { status: 200, body: { ok: true, duplicate: true, id: event.id, type: event.type } };
  }

  if (!HANDLED.has(event.type)) {
    // Aceito, mas não temos handler dedicado — marcar processado sem erro.
    await safeMarkProcessed(event.id, null);
    return { status: 200, body: { ok: true, ignored: true, id: event.id, type: event.type } };
  }

  // 3) Dispatch
  try {
    await dispatch(event);
    await safeMarkProcessed(event.id, null);
    return { status: 200, body: { ok: true, id: event.id, type: event.type } };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    await safeMarkProcessed(event.id, msg);
    // 200 para o Stripe não retentar em erro de negócio; retentativa manual via dashboard.
    return { status: 200, body: { ok: false, id: event.id, type: event.type, error: msg } };
  }
}

async function safeMarkProcessed(eventId: string, error: string | null): Promise<void> {
  try {
    await markWebhookProcessed(eventId, error);
  } catch {
    /* noop — evitar loop de erro no webhook */
  }
}

// -----------------------------------------------------------------
// Dispatch
// -----------------------------------------------------------------

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.created":
    case "customer.updated":
      return handleCustomer(event.data.object as Stripe.Customer);
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateSubscriptionStatus(sub.id, "canceled");
      return;
    }
    case "invoice.paid":
      return handleInvoicePaid(event.data.object as Stripe.Invoice);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
  }
}

/**
 * Resolve o companyId de um Customer/Subscription usando metadata (fonte primária)
 * ou o mapeamento persistido em stripe_customer (fallback).
 */
async function resolveCompanyId(
  metadata: Stripe.Metadata | null | undefined,
  stripeCustomerId: string | null,
): Promise<string | null> {
  const fromMeta = (metadata?.company_id as string | undefined) ?? null;
  if (fromMeta) return fromMeta;
  if (!stripeCustomerId) return null;
  const row = await findStripeCustomerByStripeId(stripeCustomerId);
  return row?.company_id ?? null;
}

async function handleCustomer(c: Stripe.Customer): Promise<void> {
  const companyId = await resolveCompanyId(c.metadata ?? null, c.id);
  if (!companyId) {
    // Sem vínculo — não sabemos a empresa. Aceito, mas nada a fazer.
    return;
  }
  await upsertStripeCustomer({
    companyId,
    stripeCustomerId: c.id,
    email: c.email ?? null,
    metadata: (c.metadata as Record<string, unknown>) ?? {},
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const companyId = await resolveCompanyId(session.metadata ?? null, stripeCustomerId);
  if (!companyId || !stripeCustomerId) return;

  // Garante o vínculo customer↔company antes do upsert da subscription.
  await upsertStripeCustomer({
    companyId,
    stripeCustomerId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    metadata: (session.metadata as Record<string, unknown>) ?? {},
  });

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (!subId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const input = subscriptionFromStripe(companyId, sub, email);
  await syncSubscription(input);
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const companyId = await resolveCompanyId(sub.metadata ?? null, stripeCustomerId);
  if (!companyId) return; // sem vínculo → nada a sincronizar

  // Tenta obter e-mail do Customer para persistência.
  let email: string | null = null;
  try {
    const stripe = getStripe();
    const c = await stripe.customers.retrieve(stripeCustomerId);
    if (!(c as any).deleted) email = (c as Stripe.Customer).email ?? null;
  } catch {
    /* opcional */
  }
  const input = subscriptionFromStripe(companyId, sub, email);
  await syncSubscription(input);
}

async function handleInvoicePaid(inv: Stripe.Invoice): Promise<void> {
  const subId =
    typeof (inv as any).subscription === "string"
      ? ((inv as any).subscription as string)
      : (inv as any).subscription?.id ?? null;
  if (!subId) return;
  await updateSubscriptionStatus(subId, "active");
}

async function handleInvoicePaymentFailed(inv: Stripe.Invoice): Promise<void> {
  const subId =
    typeof (inv as any).subscription === "string"
      ? ((inv as any).subscription as string)
      : (inv as any).subscription?.id ?? null;
  if (!subId) return;
  await updateSubscriptionStatus(subId, "past_due");
}
