/**
 * Processamento centralizado dos eventos de webhook do Stripe.
 *
 * Server-only. Suporta os dois formatos de payload emitidos pelo Stripe:
 *  - Snapshot events (API v1 clássica) — payload contém o objeto completo em
 *    `data.object`. Verificados com `webhooks.constructEventAsync`.
 *  - Thin event notifications (API v2 / Event Destinations) — payload traz
 *    apenas `id`, `type`, `related_object`. Verificados com
 *    `parseEventNotificationAsync` e o objeto real é buscado sob demanda via
 *    `fetchRelatedObject()`.
 *
 * A idempotência é preservada gravando o `id` do evento em
 * `stripe_webhook_event` — funciona igual para os dois formatos, já que ambos
 * têm identificadores únicos.
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

/**
 * Tipos snapshot (v1) que despachamos ativamente. Thin events são mapeados
 * para o mesmo conjunto lógico via `normalizeThinType()` antes do dispatch.
 */
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
 * Valida assinatura HMAC, registra o evento (dedup), despacha e marca
 * processado. Nunca lança — devolve sempre um WebhookResult.
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

  // Detecta thin (v2) vs snapshot (v1) sem consumir o corpo — precisamos do
  // texto cru para validar HMAC em ambos os caminhos.
  const format = detectPayloadFormat(rawBody);

  const stripe = getStripe();
  let normalized: NormalizedEvent;
  try {
    if (format === "thin") {
      const notification: any = await (stripe as any).parseEventNotificationAsync(
        rawBody,
        signatureHeader,
        webhookSecret,
      );
      normalized = {
        format: "thin",
        id: notification.id,
        type: notification.type,
        apiVersion: "v2",
        payload: notification,
        notification,
      };
    } else {
      const event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signatureHeader,
        webhookSecret,
      );
      normalized = {
        format: "snapshot",
        id: event.id,
        type: event.type,
        apiVersion: event.api_version ?? null,
        payload: event,
        event,
      };
    }
  } catch (err: any) {
    return {
      status: 400,
      body: { ok: false, error: `assinatura inválida: ${err?.message ?? String(err)}` },
    };
  }

  // Registro + idempotência (compartilhado entre formatos via id único).
  let duplicate = false;
  try {
    const rec = await recordWebhookEvent({
      stripeEventId: normalized.id,
      type: normalized.type,
      apiVersion: normalized.apiVersion,
      payload: normalized.payload,
    });
    duplicate = rec.duplicate;
  } catch (err: any) {
    return {
      status: 500,
      body: { ok: false, error: `falha ao registrar evento: ${err?.message ?? err}` },
    };
  }

  if (duplicate) {
    return {
      status: 200,
      body: { ok: true, duplicate: true, id: normalized.id, type: normalized.type },
    };
  }

  const canonicalType = normalizeThinType(normalized.type);
  if (!HANDLED.has(canonicalType)) {
    await safeMarkProcessed(normalized.id, null);
    return {
      status: 200,
      body: { ok: true, ignored: true, id: normalized.id, type: normalized.type },
    };
  }

  try {
    await dispatch(normalized, canonicalType);
    await safeMarkProcessed(normalized.id, null);
    return { status: 200, body: { ok: true, id: normalized.id, type: normalized.type } };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    await safeMarkProcessed(normalized.id, msg);
    // 200 evita retry infinito por erro de negócio — retry manual via dashboard.
    return {
      status: 200,
      body: { ok: false, id: normalized.id, type: normalized.type, error: msg },
    };
  }
}

// -----------------------------------------------------------------
// Detecção e normalização
// -----------------------------------------------------------------

type NormalizedEvent =
  | {
      format: "snapshot";
      id: string;
      type: string;
      apiVersion: string | null;
      payload: unknown;
      event: Stripe.Event;
    }
  | {
      format: "thin";
      id: string;
      type: string;
      apiVersion: "v2";
      payload: unknown;
      notification: any;
    };

function detectPayloadFormat(rawBody: string): "thin" | "snapshot" {
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && parsed.object === "v2.core.event") return "thin";
  } catch {
    /* fallback abaixo */
  }
  return "snapshot";
}

/**
 * Converte um `type` thin (v1/v2 namespaced) no `type` snapshot equivalente
 * quando existir. Exemplos:
 *   v1.customer.subscription.updated   -> customer.subscription.updated
 *   v1.checkout.session.completed      -> checkout.session.completed
 * Tipos sem prefixo `v1.`/`v2.` são retornados inalterados.
 */
function normalizeThinType(type: string): string {
  if (type.startsWith("v1.")) return type.slice(3);
  if (type.startsWith("v2.")) return type.slice(3);
  return type;
}

async function safeMarkProcessed(eventId: string, error: string | null): Promise<void> {
  try {
    await markWebhookProcessed(eventId, error);
  } catch {
    /* noop */
  }
}

// -----------------------------------------------------------------
// Dispatch
// -----------------------------------------------------------------

async function dispatch(evt: NormalizedEvent, canonicalType: string): Promise<void> {
  // Resolve o objeto associado — snapshot já traz inline; thin precisa buscar.
  const object = await resolveEventObject(evt);
  if (!object) {
    throw new Error(`objeto do evento indisponível (${evt.type})`);
  }

  switch (canonicalType) {
    case "customer.created":
    case "customer.updated":
      return handleCustomer(object as Stripe.Customer);
    case "checkout.session.completed":
      return handleCheckoutCompleted(object as Stripe.Checkout.Session);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpsert(object as Stripe.Subscription);
    case "customer.subscription.deleted": {
      const sub = object as Stripe.Subscription;
      const { isClubMetadata, cancelClubMembershipBySubscription } = await import(
        "@/lib/club/club.server"
      );
      if (isClubMetadata(sub.metadata)) {
        await cancelClubMembershipBySubscription(sub.id);
        return;
      }
      await updateSubscriptionStatus(sub.id, "canceled");
      return;
    }
    case "invoice.paid":
      return handleInvoicePaid(object as Stripe.Invoice);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(object as Stripe.Invoice);
  }
}

async function resolveEventObject(evt: NormalizedEvent): Promise<any | null> {
  if (evt.format === "snapshot") {
    return (evt.event.data as any)?.object ?? null;
  }
  // Thin: buscar o objeto real via SDK.
  const fetched = await evt.notification.fetchRelatedObject?.();
  return fetched ?? null;
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
  if (!companyId) return;
  await upsertStripeCustomer({
    companyId,
    stripeCustomerId: c.id,
    email: c.email ?? null,
    metadata: (c.metadata as Record<string, unknown>) ?? {},
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const subIdEarly =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  // Clube da barbearia (cliente final) — não toca na assinatura SaaS.
  const { isClubMetadata, syncClubMembershipFromSubscription } = await import(
    "@/lib/club/club.server"
  );
  if (isClubMetadata(session.metadata)) {
    if (!subIdEarly) return;
    const stripeClub = getStripe();
    const clubSub = await stripeClub.subscriptions.retrieve(subIdEarly);
    await syncClubMembershipFromSubscription(clubSub as any);
    return;
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const companyId = await resolveCompanyId(session.metadata ?? null, stripeCustomerId);
  if (!companyId || !stripeCustomerId) return;

  await upsertStripeCustomer({
    companyId,
    stripeCustomerId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    metadata: (session.metadata as Record<string, unknown>) ?? {},
  });

  const subId = subIdEarly;
  if (!subId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const input = subscriptionFromStripe(companyId, sub, email);
  await syncSubscription(input);
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const { isClubMetadata, syncClubMembershipFromSubscription } = await import(
    "@/lib/club/club.server"
  );
  if (isClubMetadata(sub.metadata)) {
    await syncClubMembershipFromSubscription(sub);
    return;
  }

  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const companyId = await resolveCompanyId(sub.metadata ?? null, stripeCustomerId);
  if (!companyId) return;

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
