export type PlanSlug = 'starter' | 'pro' | 'elite';

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
  elite: 'Elite',
};

const MATRIX: Record<PlanSlug, PlanFeatures> = {
  starter: {
    multiprofissional: false,
    comissoes: false,
    financeiro: false,
    relatoriosAvancados: false,
    fidelidade: false,
    clubeAssinatura: true,
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
  elite: {
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
  if (slug === 'pro' || slug === 'elite' || slug === 'starter') return slug;
  if (slug === 'business' || slug === 'premium') return 'elite';
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
