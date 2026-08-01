import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Crown,
  Gift,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientShell } from "@/components/client/client-shell";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  useClientDashboard,
  useClientSession,
  useClubUsage,
} from "@/hooks/use-client-account";
import { createClubBillingPortal, createClubCheckoutSession } from "@/lib/club/club-checkout.functions";

export const Route = createFileRoute("/cliente/clube")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu Clube — BarbeiroPro" },
      { name: "description", content: "Acompanhe sua assinatura, benefícios e histórico de uso." },
      { property: "og:title", content: "Meu Clube — BarbeiroPro" },
      {
        property: "og:description",
        content: "Acompanhe sua assinatura, benefícios e histórico de uso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubePage,
});

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function ClubePage() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const [selected, setSelected] = useState<string>("all");
  const usage = useClubUsage(session?.user.id, selected === "all" ? null : selected);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";
  const memberships = dash.data?.club_memberships ?? [];
  const favSlug = dash.data?.profile?.favorite_company_slug ?? null;

  const entries = useMemo(() => usage.data ?? [], [usage.data]);

  const favCompanyId = dash.data?.profile?.favorite_company_id ?? null;
  const plansQuery = useQuery({
    queryKey: ["client-club-plans", favCompanyId],
    enabled: !!favCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_club_plans", {
        _company_id: favCompanyId!,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
  const plans = plansQuery.data ?? [];
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const startCheckout = useServerFn(createClubCheckoutSession);

  const buyPlan = async (planId: string) => {
    if (!favCompanyId || !favSlug) return;
    setBuying(planId);
    try {
      const { url } = await startCheckout({
        data: {
          companyId: favCompanyId,
          clubPlanId: planId,
          slug: favSlug,
          origin: window.location.origin,
          name: nome,
          phone: dash.data?.profile?.phone || "00000000000",
          returnPath: "/cliente/clube",
        },
      });
      if (!url) throw new Error("Checkout indisponível.");
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o checkout.");
      setBuying(null);
    }
  };

  // Retorno do Stripe: reconcilia a assinatura e atualiza a tela.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("club_session");
    if (!sessionId) return;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const res = await dash.refetch();
      const active = (res.data?.club_memberships ?? []).some((m) => m.status === "ativo");
      if (active) {
        toast.success("Assinatura do Clube ativa!");
        window.history.replaceState({}, "", "/cliente/clube");
        return;
      }
      if (tries < 6) setTimeout(tick, 2000);
    };
    void tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const [portalFor, setPortalFor] = useState<string | null>(null);
  const openBillingPortal = useServerFn(createClubBillingPortal);

  const openPortal = async (clubMemberId: string) => {
    setPortalFor(clubMemberId);
    try {
      const { url } = await openBillingPortal({
        data: { clubMemberId, returnUrl: `${window.location.origin}/cliente/clube` },
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o portal.");
      setPortalFor(null);
    }
  };

  return (
    <ClientShell
      title="Meu Clube"
      subtitle="Assinaturas, benefícios e uso"
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
    >
      {dash.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : memberships.length === 0 ? (
        <Card>
          <CardContent className="space-y-5 py-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <Gift className="h-10 w-10 text-[var(--brand)]" />
              <p className="font-medium">Você ainda não faz parte de um Clube</p>
              <p className="text-sm text-muted-foreground">
                Assinantes têm créditos mensais, descontos e prioridade no atendimento.
              </p>
            </div>

            {!favCompanyId ? (
              <p className="text-center text-sm text-muted-foreground">
                Faça seu primeiro agendamento para ver os planos da sua barbearia.
              </p>
            ) : plansQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Sua barbearia ainda não publicou planos de assinatura.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => {
                  const beneficios: string[] = Array.isArray(p.beneficios)
                    ? (p.beneficios as string[])
                    : [];
                  return (
                    <Card
                      key={p.id}
                      className={
                        selectedPlan === p.id
                          ? "border-2 border-[var(--brand)]"
                          : "border transition hover:shadow-md"
                      }
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Crown className="h-4 w-4 text-[var(--brand)]" /> {p.nome}
                        </CardTitle>
                        <CardDescription>
                          {formatBRL(p.preco_cents)}/mês • {p.creditos_mensais} crédito(s) por mês
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {beneficios.length ? (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {beneficios.map((b, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[var(--brand)]" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <Button
                          className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                          disabled={!!buying}
                          onClick={() => {
                            setSelectedPlan(p.id);
                            void buyPlan(p.id);
                          }}
                        >
                          {buying === p.id ? "Abrindo checkout..." : "Comprar Clube"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {favSlug ? (
              <div className="text-center">
                <Button asChild variant="outline">
                  <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Ver planos ao agendar
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map((m) => {
              const ativo = m.status === "ativo";
              const utilizados = m.beneficios_utilizados ?? Math.max(0, m.creditos_mensais - m.creditos_restantes);
              const pct =
                m.creditos_mensais > 0 ? (m.creditos_restantes / m.creditos_mensais) * 100 : 0;
              return (
                <Card key={m.id} className={ativo ? "border-[var(--brand)]/40" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Crown className="h-4 w-4 text-[var(--brand)]" /> {m.plano_nome}
                        </CardTitle>
                        <CardDescription>{m.company_name}</CardDescription>
                      </div>
                      <Badge
                        className={
                          ativo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {ativo
                          ? m.cancel_at_period_end
                            ? "Ativo até o fim do período"
                            : "Ativo"
                          : m.status === "expirado"
                            ? "Expirado"
                            : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Wallet className="h-3.5 w-3.5" /> Saldo disponível
                        </p>
                        <p className="text-2xl font-bold">{m.creditos_restantes}</p>
                        <p className="text-[11px] text-muted-foreground">
                          de {m.creditos_mensais}/mês
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5" /> Próxima renovação
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {m.current_period_end
                            ? format(new Date(m.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBRL(m.preco_cents)}/mês
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Benefícios utilizados</p>
                        <p className="text-lg font-semibold">{utilizados}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Benefícios restantes</p>
                        <p className="text-lg font-semibold">{m.creditos_restantes}</p>
                      </div>
                    </div>
                    <Progress value={pct} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        disabled={portalFor === m.id}
                        onClick={() => openPortal(m.id)}
                      >
                        <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                        {portalFor === m.id ? "Abrindo..." : "Gerenciar assinatura"}
                      </Button>
                      <Button variant="outline" asChild>
                        <Link
                          to="/agendar/$slug"
                          params={{ slug: favSlug ?? "" }}
                          search={{}}
                          disabled={!favSlug}
                        >
                          <ArrowDownCircle className="mr-1.5 h-4 w-4" /> Ver planos
                        </Link>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No portal você faz upgrade, downgrade, troca o cartão ou cancela — os
                      benefícios seguem válidos até o fim do período pago.
                    </p>

                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Histórico de benefícios</CardTitle>
                <CardDescription>Cada uso e devolução de crédito</CardDescription>
              </div>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as assinaturas</SelectItem>
                  {memberships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.plano_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {usage.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              ) : entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum benefício utilizado ainda.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {entries.map((e) => {
                    const uso = e.movimento === "uso";
                    return (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-background">
                          {uso ? (
                            <ArrowDownCircle className="h-4 w-4 text-[var(--brand)]" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                          )}
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {uso ? "Benefício utilizado" : "Crédito devolvido"}
                              {e.service_name ? ` • ${e.service_name}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.plano_nome} • {e.company_name} •{" "}
                              {format(new Date(e.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {uso ? "-" : "+"}
                            {e.quantidade}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ClientShell>
  );
}
