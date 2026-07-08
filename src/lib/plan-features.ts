export type PlanSlug = 'starter' | 'pro' | 'business';

export type PlanFeatureKey =
  | 'multiprofissional'
  | 'comissoes'
  | 'financeiro'
  | 'relatoriosAvancados'
  | 'fidelidade'
  | 'clubeAssinatura'
  | 'lembretesWhatsapp'
  | 'apiWebhooks';

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export const PLAN_LABEL: Record<PlanSlug, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

const MATRIX: Record<PlanSlug, PlanFeatures> = {
  starter: {
    multiprofissional: false,
    comissoes: false,
    financeiro: false,
    relatoriosAvancados: false,
    fidelidade: false,
    clubeAssinatura: false,
    lembretesWhatsapp: false,
    apiWebhooks: false,
  },
  pro: {
    multiprofissional: true,
    comissoes: true,
    financeiro: true,
    relatoriosAvancados: true,
    fidelidade: true,
    clubeAssinatura: false,
    lembretesWhatsapp: true,
    apiWebhooks: false,
  },
  business: {
    multiprofissional: true,
    comissoes: true,
    financeiro: true,
    relatoriosAvancados: true,
    fidelidade: true,
    clubeAssinatura: true,
    lembretesWhatsapp: true,
    apiWebhooks: true,
  },
};

export function normalizePlanSlug(slug: string | null | undefined): PlanSlug {
  if (slug === 'pro' || slug === 'business' || slug === 'starter') return slug;
  return 'starter';
}

export function featuresFor(slug: string | null | undefined): PlanFeatures {
  return MATRIX[normalizePlanSlug(slug)];
}

export function featureEnabled(
  slug: string | null | undefined,
  key: PlanFeatureKey,
): boolean {
  return featuresFor(slug)[key];
}
