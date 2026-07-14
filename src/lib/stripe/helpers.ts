/**
 * Helpers puros (sem I/O) para converter entre o SDK do Stripe e os tipos
 * internos do BarbeiroPro. Podem ser usados no servidor.
 */
import type Stripe from "stripe";
import { PLANS, PLAN_SLUGS, type PlanSlug } from "./plans";
import type { SubscriptionStatus } from "./types";

export function priceIdForPlan(slug: PlanSlug): string | null {
  return PLANS[slug].stripePriceId;
}

export function productIdForPlan(slug: PlanSlug): string | null {
  return PLANS[slug].stripeProductId;
}

export function planSlugFromSubscription(
  sub: Pick<Stripe.Subscription, "items">,
): PlanSlug | null {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const productId =
    (sub.items?.data?.[0]?.price?.product as string | undefined) ?? null;
  for (const slug of PLAN_SLUGS) {
    if (priceId && PLANS[slug].stripePriceId === priceId) return slug;
    if (productId && PLANS[slug].stripeProductId === productId) return slug;
  }
  return null;
}

export function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  return status as SubscriptionStatus;
}

export function tsToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Metadata padrão que anexamos a Customers, Subscriptions e Checkout Sessions
 * para conseguirmos reconciliar com nossa base sem depender do email.
 */
export function buildStripeMetadata(input: {
  companyId: string;
  planSlug?: PlanSlug;
  userId?: string | null;
}): Record<string, string> {
  const meta: Record<string, string> = {
    company_id: input.companyId,
    app: "barbeiropro",
  };
  if (input.planSlug) meta.plan_slug = input.planSlug;
  if (input.userId) meta.user_id = input.userId;
  return meta;
}
