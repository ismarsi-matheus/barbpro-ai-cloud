/**
 * Núcleo compartilhado (client-safe) da assinatura da barbearia.
 *
 * Fonte única de verdade dos tipos e das derivações de plano/status.
 * Não faz I/O — pode ser importado em qualquer lugar.
 */
import {
  featuresFor,
  normalizePlanSlug,
  PLAN_LABEL,
  type PlanFeatureKey,
  type PlanFeatures,
  type PlanSlug,
} from "@/lib/plan-features";

export type { PlanFeatureKey, PlanFeatures, PlanSlug };
export { PLAN_LABEL, normalizePlanSlug };

/** Status unificado da assinatura, independente do provedor. */
export type SubscriptionUiStatus =
  | "trial"
  | "ativa"
  | "pendente"
  | "atrasada"
  | "cancelada"
  | "sem_assinatura";

export const STATUS_LABEL: Record<SubscriptionUiStatus, string> = {
  trial: "Trial",
  ativa: "Ativa",
  pendente: "Pendente",
  atrasada: "Em atraso",
  cancelada: "Cancelada",
  sem_assinatura: "Sem assinatura",
};

export const PLAN_PRICE_CENTS: Record<PlanSlug, number> = {
  starter: 9700,
  pro: 29700,
  elite: 49700,
};

/** Rótulos amigáveis de cada recurso, usados na página "Minha Assinatura". */
export const FEATURE_LABEL: Record<PlanFeatureKey, string> = {
  multiprofissional: "Multiprofissional",
  comissoes: "Comissões",
  financeiro: "Financeiro completo",
  relatoriosAvancados: "Relatórios avançados",
  fidelidade: "Programa de fidelidade",
  clubeAssinatura: "Clube de assinatura",
  aiGrowth: "AI Growth / PlanBits",
  lembretesWhatsapp: "Lembretes automáticos",
  apiWebhooks: "API e webhooks",
};

/** Recursos sempre inclusos, em qualquer plano. */
export const BASE_FEATURES = ["Agenda", "Clientes", "Serviços", "Produtos", "Comandas"];

export type SubscriptionSnapshot = {
  companyId: string;
  planSlug: PlanSlug;
  planName: string;
  priceCents: number;
  status: SubscriptionUiStatus;
  providerStatus: string | null;
  /** De onde veio o plano: assinatura Stripe ou fallback do cadastro da empresa. */
  source: "subscription" | "company";
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  paymentMethod: { brand: string | null; last4: string | null } | null;
  features: PlanFeatures;
};

/** Normaliza o status do provedor + o status de cobrança da empresa. */
export function normalizeStatus(
  providerStatus: string | null | undefined,
  companyStatus: string | null | undefined,
  trialEndsAt?: string | null,
): SubscriptionUiStatus {
  switch (providerStatus) {
    case "active":
      return "ativa";
    case "trialing":
      return "trial";
    case "past_due":
    case "unpaid":
      return "atrasada";
    case "incomplete":
    case "paused":
      return "pendente";
    case "canceled":
    case "incomplete_expired":
      return "cancelada";
  }
  switch (companyStatus) {
    case "ativo":
      return "ativa";
    case "trial": {
      if (trialEndsAt && new Date(trialEndsAt).getTime() <= Date.now()) return "cancelada";
      return "trial";
    }
    case "inadimplente":
      return "atrasada";
    case "suspenso":
      return "pendente";
    case "cancelado":
      return "cancelada";
  }
  return "sem_assinatura";
}

/** Uma assinatura nesses status dá acesso pleno aos recursos do plano. */
export function isEntitled(status: SubscriptionUiStatus): boolean {
  return status === "ativa" || status === "trial";
}

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const diff = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function emptySnapshot(companyId: string): SubscriptionSnapshot {
  return {
    companyId,
    planSlug: "starter",
    planName: PLAN_LABEL.starter,
    priceCents: PLAN_PRICE_CENTS.starter,
    status: "sem_assinatura",
    providerStatus: null,
    source: "company",
    startedAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    paymentMethod: null,
    features: featuresFor("starter"),
  };
}

/** Constrói o snapshot a partir das linhas cruas de `company` + `subscription`. */
export function buildSnapshot(input: {
  companyId: string;
  company: {
    plano?: string | null;
    selected_plan_slug?: string | null;
    status_cobranca?: string | null;
    trial_ate?: string | null;
    proximo_vencimento?: string | null;
    created_at?: string | null;
  } | null;
  subscription: {
    status?: string | null;
    metadata?: Record<string, unknown> | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    trial_ends_at?: string | null;
    cancel_at_period_end?: boolean | null;
    canceled_at?: string | null;
    created_at?: string | null;
    external_subscription_id?: string | null;
    external_customer_id?: string | null;
    plan_slug?: string | null;
  } | null;
  stripeCustomerId?: string | null;
  paymentMethod?: { brand: string | null; last4: string | null } | null;
}): SubscriptionSnapshot {
  const { company, subscription } = input;
  const subPlanSlug =
    (subscription?.plan_slug as string | undefined) ||
    (subscription?.metadata?.["plan_slug"] as string | undefined) ||
    null;

  const hasSub = !!subscription;
  const planSlug = normalizePlanSlug(
    hasSub && subPlanSlug
      ? subPlanSlug
      : company?.selected_plan_slug ?? company?.plano ?? null,
  );

  const trialEndsAt =
    subscription?.trial_ends_at ??
    (company?.trial_ate ? new Date(company.trial_ate).toISOString() : null);

  const status = normalizeStatus(
    subscription?.status ?? null,
    company?.status_cobranca ?? null,
    trialEndsAt,
  );

  return {
    companyId: input.companyId,
    planSlug,
    planName: PLAN_LABEL[planSlug],
    priceCents: PLAN_PRICE_CENTS[planSlug],
    status,
    providerStatus: subscription?.status ?? null,
    source: hasSub ? "subscription" : "company",
    startedAt: subscription?.created_at ?? company?.created_at ?? null,
    currentPeriodStart: subscription?.current_period_start ?? null,
    currentPeriodEnd:
      subscription?.current_period_end ??
      (company?.proximo_vencimento
        ? new Date(company.proximo_vencimento).toISOString()
        : null),
    trialEndsAt,
    cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
    canceledAt: subscription?.canceled_at ?? null,
    stripeCustomerId:
      input.stripeCustomerId ?? subscription?.external_customer_id ?? null,
    stripeSubscriptionId: subscription?.external_subscription_id ?? null,
    paymentMethod: input.paymentMethod ?? null,
    features: featuresFor(planSlug),
  };
}
