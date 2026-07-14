/**
 * Mapeamento central dos planos do BarbeiroPro.
 *
 * A ideia é isolar aqui todos os IDs do Stripe (product/price) para que,
 * no futuro, seja possível trocar IDs sem alterar código de negócio.
 *
 * Os IDs reais do Stripe (prod_..., price_...) devem ser preenchidos via
 * variáveis de ambiente do servidor, nunca hardcoded em produção.
 */

export type PlanSlug = "starter" | "pro" | "elite";
export type BillingInterval = "month" | "year";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  priceCents: number;
  currency: "brl";
  interval: BillingInterval;
  trialDays: number;
  /** ID do Produto no Stripe (prod_...). Vem de env. */
  stripeProductId: string | null;
  /** ID do Price no Stripe (price_...). Vem de env. */
  stripePriceId: string | null;
  features: string[];
  highlight?: boolean;
}

function env(name: string): string | null {
  const v = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return v && v.length > 0 ? v : null;
}

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  starter: {
    slug: "starter",
    name: "Starter",
    description: "Para barbeiros autônomos que estão começando.",
    priceCents: 9700,
    currency: "brl",
    interval: "month",
    trialDays: 14,
    stripeProductId: env("STRIPE_PRODUCT_STARTER"),
    stripePriceId: env("STRIPE_PRICE_STARTER"),
    features: [
      "Agenda inteligente",
      "Cadastro de clientes",
      "Link de agendamento online",
    ],
  },
  pro: {
    slug: "pro",
    name: "Pro",
    description: "Para barbearias em crescimento.",
    priceCents: 29700,
    currency: "brl",
    interval: "month",
    trialDays: 14,
    stripeProductId: env("STRIPE_PRODUCT_PRO"),
    stripePriceId: env("STRIPE_PRICE_PRO"),
    features: [
      "Tudo do Starter",
      "Multiprofissional",
      "Financeiro e comissões",
      "Lembretes automáticos",
    ],
    highlight: true,
  },
  elite: {
    slug: "elite",
    name: "Elite",
    description: "Para redes e barbearias premium.",
    priceCents: 49700,
    currency: "brl",
    interval: "month",
    trialDays: 14,
    stripeProductId: env("STRIPE_PRODUCT_ELITE"),
    stripePriceId: env("STRIPE_PRICE_ELITE"),
    features: [
      "Tudo do Pro",
      "Clube de assinatura",
      "IA de crescimento",
      "API e webhooks",
      "Suporte prioritário",
    ],
  },
};

export const PLAN_SLUGS: PlanSlug[] = ["starter", "pro", "elite"];

export function getPlan(slug: PlanSlug): PlanDefinition {
  return PLANS[slug];
}

/** Resolve um Price ID do Stripe para um slug interno. */
export function planSlugFromPriceId(priceId: string | null | undefined): PlanSlug | null {
  if (!priceId) return null;
  for (const slug of PLAN_SLUGS) {
    if (PLANS[slug].stripePriceId === priceId) return slug;
  }
  return null;
}

/** Resolve um Product ID do Stripe para um slug interno. */
export function planSlugFromProductId(productId: string | null | undefined): PlanSlug | null {
  if (!productId) return null;
  for (const slug of PLAN_SLUGS) {
    if (PLANS[slug].stripeProductId === productId) return slug;
  }
  return null;
}

export function formatPlanPrice(plan: PlanDefinition): string {
  return (plan.priceCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
