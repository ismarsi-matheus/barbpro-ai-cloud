import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCheckoutSessionStatus } from "@/lib/stripe/session-status.functions";
import { PLANS } from "@/lib/stripe/plans";

export const Route = createFileRoute("/dashboard/assinatura/sucesso")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: (search.session_id as string | undefined) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Assinatura confirmada — BarbeiroPro" },
      { name: "description", content: "Confirmação da sua assinatura no BarbeiroPro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getCheckoutSessionStatus);
  const [redirecting, setRedirecting] = useState(false);

  const enabled = !!session_id;

  const query = useQuery({
    queryKey: ["stripe-checkout-status", session_id],
    queryFn: () => fetchStatus({ data: { sessionId: session_id } }),
    enabled,
    refetchInterval: (q) =>
      q.state.data?.subscriptionActive ? false : 3000,
    retry: 2,
  });

  const active = query.data?.subscriptionActive === true;
  const planSlug = query.data?.planSlug ?? query.data?.currentPlanSlug ?? null;
  const planName = planSlug
    ? PLANS[planSlug as keyof typeof PLANS]?.name ?? planSlug
    : null;

  useEffect(() => {
    if (active && !redirecting) {
      setRedirecting(true);
      // Garante que o gate de paywall releia a empresa já com status atualizado.
      qc.invalidateQueries({ queryKey: ["current-company"] });
      const t = setTimeout(() => {
        navigate({ to: "/app/dashboard" });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [active, redirecting, navigate, qc]);

  if (!enabled) {
    return (
      <ErrorState
        message="Sessão de pagamento não encontrada."
        detail="O link de retorno está incompleto. Volte ao dashboard e tente novamente."
      />
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message="Não conseguimos verificar sua assinatura."
        detail={(query.error as Error)?.message ?? "Tente novamente em instantes."}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {active ? (
            <>
              <div className="flex justify-center animate-scale-in">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-2 animate-fade-in">
                <h1 className="text-2xl font-bold">Assinatura confirmada!</h1>
                {planName && (
                  <p className="text-muted-foreground">
                    Plano <span className="font-semibold text-foreground">{planName}</span> ativado com sucesso.
                  </p>
                )}
                <p className="text-sm text-muted-foreground pt-2">
                  Redirecionando para seu dashboard…
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Processando pagamento…</h1>
                <p className="text-muted-foreground">
                  Recebemos sua assinatura e estamos ativando seu plano.
                </p>
                <p className="text-sm text-muted-foreground pt-2">
                  Isso pode levar alguns segundos. Você pode aguardar aqui — a página atualiza sozinha.
                </p>
                {planName && (
                  <p className="text-sm pt-1">
                    Plano contratado: <span className="font-semibold">{planName}</span>
                  </p>
                )}
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link to="/app/dashboard">Ir para o dashboard agora</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
              <AlertTriangle className="h-16 w-16 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{message}</h1>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/app/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
