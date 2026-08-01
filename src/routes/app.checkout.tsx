import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/lib/stripe/checkout.functions";
import { SUBSCRIPTION_PLAN_CATALOG } from "@/lib/subscription-plan-catalog";

export const Route = createFileRoute("/app/checkout")({ component: CheckoutPage });


type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_cents: number;
  intervalo: string;
  features: string[];
  destaque: boolean | null;
  ordem: number | null;
  checkout_url: string | null;
};

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: company } = useCurrentCompany();

  const { data: plans = [] } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan" as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      const activePlans = (data ?? []) as unknown as Plan[];
      return activePlans.length > 0
        ? activePlans
        : SUBSCRIPTION_PLAN_CATALOG;
    },
  });

  // Polling: a cada 5s, ver se virou ativo
  useEffect(() => {
    if (!company?.id) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("company")
        .select("status_cobranca")
        .eq("id", company.id)
        .maybeSingle();
      if (data?.status_cobranca === "ativo") {
        toast.success("Assinatura confirmada! Bem-vindo de volta.");
        qc.invalidateQueries({ queryKey: ["current-company"] });
        navigate({ to: "/app/dashboard" });
      }
    }, 5000);
    return () => clearInterval(t);
  }, [company?.id, navigate, qc]);

  const createCheckoutFn = useServerFn(createCheckoutSession);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const openCheckout = async (p: Plan) => {
    if (!company?.id) {
      toast.error("Empresa não carregada.");
      return;
    }
    const slug = p.slug as "starter" | "pro" | "elite";
    if (!["starter", "pro", "elite"].includes(slug)) {
      toast.error(`Plano "${p.slug}" não está mapeado no Stripe.`);
      return;
    }
    setLoadingSlug(slug);
    try {
      const res = await createCheckoutFn({
        data: {
          companyId: company.id,
          planSlug: slug,
          origin: window.location.origin,
        },
      });
      if (!res?.url) throw new Error("URL de checkout não retornada.");
      window.location.href = res.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao iniciar checkout.");
      setLoadingSlug(null);
    }
  };


  const status = company?.status_cobranca;
  const headerMsg = useMemo(() => {
    if (status === "suspenso") return "Sua conta está suspensa. Escolha um plano para reativar.";
    if (status === "cancelado") return "Sua conta foi cancelada. Reative escolhendo um plano.";
    if (status === "inadimplente") return "Pagamento em atraso. Regularize escolhendo um plano abaixo.";
    if (status === "trial") return "Seu período de teste terminou. Escolha um plano para continuar.";
    return "Escolha o plano ideal para sua barbearia.";
  }, [status]);

  return (
    <div className="space-y-6">
      <PageHeader title="Assinar" description={headerMsg} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`relative flex flex-col ${p.destaque ? "ring-2 ring-amber-400 shadow-lg" : ""}`}
          >
            {p.destaque && (
              <Badge className="absolute -top-2 right-4 bg-amber-500">
                <Star className="w-3 h-3 mr-1 fill-white" /> Mais escolhido
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{p.nome}</CardTitle>
              {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div>
                <span className="text-3xl font-semibold">{brl(p.preco_cents)}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  / {p.intervalo === "year" ? "ano" : "mês"}
                </span>
              </div>
              {p.features && p.features.length > 0 && (
                <ul className="space-y-1.5 text-sm flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                onClick={() => openCheckout(p)}
                disabled={loadingSlug === p.slug}
                className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
              >
                {loadingSlug === p.slug ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                {loadingSlug === p.slug ? "Redirecionando..." : "Assinar Plano"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">
            Nenhum plano disponível no momento.
          </p>
        )}
      </div>
    </div>
  );
}
