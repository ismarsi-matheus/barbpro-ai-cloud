import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTenant } from "@/components/sidebar-tenant";
import { TrialBanner } from "@/components/trial-banner";
import { useCurrentCompany, clearImpersonation } from "@/hooks/use-current-company";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/entrar", search: { tab: "signin" } as any });
    }
    // Forçar troca de senha no primeiro acesso
    const { data: cu } = await supabase
      .from("company_user")
      .select("forcar_troca_senha")
      .eq("user_id", data.user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    if (cu?.forcar_troca_senha) {
      throw redirect({ to: "/trocar-senha" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: company, isLoading } = useCurrentCompany();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const impersonated = !!(company as any)?.__impersonated;

  useEffect(() => {
    if (isLoading) return;
    if (!company && !pathname.endsWith("/onboarding")) {
      navigate({ to: "/app/onboarding" });
      return;
    }
    if (company && !company.onboarding_concluido && !pathname.endsWith("/onboarding")) {
      navigate({ to: "/app/onboarding" });
      return;
    }
    // Paywall: redireciona contas sem assinatura ativa para /app/checkout
    if (company && company.onboarding_concluido && !impersonated) {
      const status = company.status_cobranca;
      const trialExpired =
        status === "trial" &&
        company.trial_ate &&
        new Date(company.trial_ate as any).getTime() <= Date.now();
      const needsPaywall =
        status === "suspenso" ||
        status === "cancelado" ||
        status === "inadimplente" ||
        trialExpired;
      if (needsPaywall && !pathname.endsWith("/checkout")) {
        navigate({ to: "/app/checkout" });
      }
    }
  }, [company, isLoading, navigate, pathname, impersonated]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const suspended = company?.status_cobranca === "suspenso";
  const allowedWhenSuspended = pathname.endsWith("/configuracoes") || pathname.endsWith("/onboarding");

  const exitImpersonation = () => {
    clearImpersonation();
    qc.invalidateQueries({ queryKey: ["current-company"] });
    navigate({ to: "/master/listaBarbearias" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--surface)" }}>
      {impersonated && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>
              Você está visualizando como <b>{company?.nome_fantasia || company?.name}</b> (impersonação)
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="px-3 py-1 rounded bg-white/15 hover:bg-white/25 text-xs font-medium"
          >
            Sair da impersonação
          </button>
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        <SidebarTenant companyName={company?.nome_fantasia || company?.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner company={company} />
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            {suspended && !allowedWhenSuspended ? <SuspendedView /> : <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}

function SuspendedView() {
  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <Ban className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold">Acesso temporariamente bloqueado</h2>
        <p className="text-sm text-muted-foreground">
          Sua assinatura foi suspensa por inadimplência. Regularize a cobrança para liberar o painel novamente.
        </p>
        <Link to="/app/configuracoes">
          <Button className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            Ir para Cobrança
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
