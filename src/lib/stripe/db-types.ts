/**
 * Tipagens do domínio Stripe persistido (linhas do banco).
 * Reflete o schema criado na migration da Etapa 2.
 */
import type { PlanSlug, BillingInterval } from "./plans";
import type { SubscriptionStatus } from "./types";

export interface StripeCustomerRow {
  id: string;
  company_id: string;
  stripe_customer_id: string;
  email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  company_id: string;
  plan_id: string | null;
  status: SubscriptionStatus | string;
  provider: string; // 'stripe' | 'manual' | ...
  external_subscription_id: string | null;
  external_customer_id: string | null;
  buyer_email: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_ends_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StripeWebhookEventRow {
  id: string;
  stripe_event_id: string;
  type: string;
  api_version: string | null;
  payload: unknown;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

/** Dados que a função sync_stripe_subscription espera. */
export interface SyncSubscriptionInput {
  companyId: string;
  stripeCustomerId: string;
  customerEmail: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  status: SubscriptionStatus | string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, unknown>;
  planId?: string | null;
  /** Slug interno (para conveniência; não persistido diretamente aqui). */
  planSlug?: PlanSlug;
  interval?: BillingInterval;
}
