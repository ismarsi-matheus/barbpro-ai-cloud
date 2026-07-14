/**
 * Tipagens internas do domínio de billing/Stripe.
 *
 * Estes tipos são independentes do Stripe SDK — modelam apenas o que o
 * BarbeiroPro precisa persistir/expor. O mapeamento com o SDK acontece
 * nos helpers.
 */
import type Stripe from "stripe";
import type { PlanSlug, BillingInterval } from "./plans";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface StripeCustomerRef {
  companyId: string;
  stripeCustomerId: string;
  email: string | null;
  createdAt: string;
}

export interface AppSubscription {
  id: string;
  companyId: string;
  planSlug: PlanSlug;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutSessionInput {
  companyId: string;
  planSlug: PlanSlug;
  successUrl?: string;
  cancelUrl?: string;
  /** Se true, força criação de trial mesmo que o plano defina trialDays=0 */
  withTrial?: boolean;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface BillingPortalInput {
  companyId: string;
  returnUrl?: string;
}

export interface BillingPortalResult {
  url: string;
}

/** Tipos de evento do Stripe que planejamos tratar no webhook. */
export const HANDLED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
] as const;

export type HandledWebhookEvent = (typeof HANDLED_WEBHOOK_EVENTS)[number];

export interface StoredWebhookEvent {
  id: string;
  stripeEventId: string;
  type: string;
  processed: boolean;
  error: string | null;
  payload: unknown;
  createdAt: string;
}

/** Alias conveniente para o tipo do SDK. */
export type StripeSubscription = Stripe.Subscription;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeInvoice = Stripe.Invoice;
export type StripeEvent = Stripe.Event;
