/**
 * Hook único de assinatura/permissões.
 *
 * TODA verificação de recurso do painel deve passar por aqui — nunca ler
 * `company.plano` ou `subscription` diretamente na tela.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentCompany } from "@/hooks/use-current-company";
import {
  getCurrentSubscription,
  type SubscriptionInvoice,
} from "@/lib/subscription/subscription.functions";
import {
  buildSnapshot,
  isEntitled,
  type PlanFeatureKey,
  type SubscriptionSnapshot,
} from "@/lib/subscription/subscription-core";

export function useSubscription() {
  const { data: company, isLoading: loadingCompany } = useCurrentCompany();
  const fetchSubscription = useServerFn(getCurrentSubscription);
  const companyId = company?.id;

  const query = useQuery({
    queryKey: ["subscription", companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    retry: 1,
    queryFn: () => fetchSubscription({ data: { companyId: companyId! } }),
  });

  // Fallback local (offline/erro): usa o cadastro da empresa já carregado.
  const fallback: SubscriptionSnapshot | null = companyId
    ? buildSnapshot({ companyId, company: company as any, subscription: null })
    : null;

  const snapshot = query.data?.snapshot ?? fallback;
  const invoices: SubscriptionInvoice[] = query.data?.invoices ?? [];

  const can = (key: PlanFeatureKey): boolean => !!snapshot?.features[key];

  return {
    company,
    snapshot,
    invoices,
    hasBillingPortal: query.data?.hasBillingPortal ?? false,
    planSlug: snapshot?.planSlug ?? "starter",
    status: snapshot?.status ?? "sem_assinatura",
    entitled: snapshot ? isEntitled(snapshot.status) : false,
    can,
    isLoading: loadingCompany || (!!companyId && query.isLoading),
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
