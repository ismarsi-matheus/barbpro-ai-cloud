/**
 * Helpers server-only para ler/gravar tabelas Stripe usando o supabaseAdmin.
 *
 * NUNCA importar em código de cliente — arquivo `.server.ts`.
 */
import type Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  StripeCustomerRow,
  SubscriptionRow,
  StripeWebhookEventRow,
  SyncSubscriptionInput,
} from "./db-types";
import { tsToIso, planSlugFromSubscription } from "./helpers";
import { PLANS } from "./plans";

type AnyDB = ReturnType<typeof _admin>;
function _admin() {
  return supabaseAdmin as unknown as any;
}

// -----------------------------------------------------------------
// Leituras
// -----------------------------------------------------------------

export async function findStripeCustomerByCompany(
  companyId: string,
): Promise<StripeCustomerRow | null> {
  const { data, error } = await _admin()
    .from("stripe_customer")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as StripeCustomerRow | null) ?? null;
}

export async function findStripeCustomerByStripeId(
  stripeCustomerId: string,
): Promise<StripeCustomerRow | null> {
  const { data, error } = await _admin()
    .from("stripe_customer")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (error) throw error;
  return (data as StripeCustomerRow | null) ?? null;
}

export async function findActiveSubscription(
  companyId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await _admin()
    .from("subscription")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["trialing", "active", "past_due", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow | null) ?? null;
}

export async function findSubscriptionByStripeId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await _admin()
    .from("subscription")
    .select("*")
    .eq("external_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow | null) ?? null;
}

/** Retorna o slug do plano interno atualmente ativo para a empresa. */
export async function getCurrentPlanSlug(companyId: string): Promise<string | null> {
  const { data, error } = await _admin().rpc("get_current_plan_slug", {
    _company_id: companyId,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// -----------------------------------------------------------------
// Escritas
// -----------------------------------------------------------------

/** Upsert do stripe_customer. */
export async function upsertStripeCustomer(input: {
  companyId: string;
  stripeCustomerId: string;
  email?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<StripeCustomerRow> {
  const { data, error } = await _admin()
    .from("stripe_customer")
    .upsert(
      {
        company_id: input.companyId,
        stripe_customer_id: input.stripeCustomerId,
        email: input.email ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as StripeCustomerRow;
}

/** Atualiza somente o status da subscription (idempotente). */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string,
): Promise<void> {
  const { error } = await _admin().rpc("update_subscription_status", {
    _stripe_subscription_id: stripeSubscriptionId,
    _status: status,
  });
  if (error) throw error;
}

/**
 * UPSERT completo da assinatura + customer, chamando a função Postgres
 * `sync_stripe_subscription` (transacional).
 */
export async function syncSubscription(
  input: SyncSubscriptionInput,
): Promise<SubscriptionRow> {
  const { data, error } = await _admin().rpc("sync_stripe_subscription", {
    _company_id: input.companyId,
    _stripe_customer_id: input.stripeCustomerId,
    _customer_email: input.customerEmail,
    _stripe_subscription_id: input.stripeSubscriptionId,
    _stripe_price_id: input.stripePriceId,
    _stripe_product_id: input.stripeProductId,
    _status: input.status,
    _current_period_start: input.currentPeriodStart,
    _current_period_end: input.currentPeriodEnd,
    _trial_start: input.trialStart,
    _trial_end: input.trialEnd,
    _cancel_at: input.cancelAt,
    _canceled_at: input.canceledAt,
    _cancel_at_period_end: input.cancelAtPeriodEnd,
    _metadata: input.metadata ?? {},
    _plan_id: input.planId ?? null,
  });
  if (error) throw error;
  return data as SubscriptionRow;
}

/**
 * Converte um objeto Stripe.Subscription em `SyncSubscriptionInput`.
 * Requer o companyId (não vem no objeto do Stripe).
 */
export function subscriptionFromStripe(
  companyId: string,
  sub: Stripe.Subscription,
  customerEmail: string | null,
): SyncSubscriptionInput {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const productId = (item?.price?.product as string | undefined) ?? null;
  const planSlug = planSlugFromSubscription(sub) ?? undefined;
  return {
    companyId,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    customerEmail,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    stripeProductId: productId,
    status: sub.status,
    currentPeriodStart: tsToIso((sub as any).current_period_start),
    currentPeriodEnd: tsToIso((sub as any).current_period_end),
    trialStart: tsToIso(sub.trial_start),
    trialEnd: tsToIso(sub.trial_end),
    cancelAt: tsToIso(sub.cancel_at),
    canceledAt: tsToIso(sub.canceled_at),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    metadata: (sub.metadata as Record<string, unknown>) ?? {},
    planSlug,
    interval: planSlug ? PLANS[planSlug].interval : undefined,
  };
}

// -----------------------------------------------------------------
// Webhook audit (dedup)
// -----------------------------------------------------------------

/**
 * Registra um evento recebido. Se o `stripe_event_id` já existir, retorna
 * `{ duplicate: true }` — o handler deve ignorar reprocessamento.
 */
export async function recordWebhookEvent(input: {
  stripeEventId: string;
  type: string;
  apiVersion?: string | null;
  payload: unknown;
}): Promise<{ row: StripeWebhookEventRow; duplicate: boolean }> {
  const existing = await _admin()
    .from("stripe_webhook_event")
    .select("*")
    .eq("stripe_event_id", input.stripeEventId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    return { row: existing.data as StripeWebhookEventRow, duplicate: true };
  }

  const { data, error } = await _admin()
    .from("stripe_webhook_event")
    .insert({
      stripe_event_id: input.stripeEventId,
      type: input.type,
      api_version: input.apiVersion ?? null,
      payload: input.payload as any,
      processed: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { row: data as StripeWebhookEventRow, duplicate: false };
}

export async function markWebhookProcessed(
  stripeEventId: string,
  error: string | null = null,
): Promise<void> {
  const { error: err } = await _admin().rpc("mark_webhook_processed", {
    _stripe_event_id: stripeEventId,
    _error: error,
  });
  if (err) throw err;
}
