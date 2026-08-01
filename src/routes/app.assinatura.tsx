import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import {
  BASE_FEATURES,
  FEATURE_LABEL,
  PLAN_LABEL,
  PLAN_PRICE_CENTS,
  STATUS_LABEL,
  daysUntil,
  type PlanFeatureKey,
  type PlanSlug,
  type SubscriptionUiStatus,
} from "@/lib/subscription/subscription-core";
import {
  cancelSubscriptionAtPeriodEnd,
  createBillingPortalSession,
} from "@/lib/subscription/subscription.functions";

export const Route = createFileRoute("/app/assinatura")({
  head: () => ({
    meta: [
      { title: "Minha Assinatura — BarbeiroPro" },
      {
        name: "description",
        content: "Gerencie o plano, a cobrança e os recursos da sua barbearia.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssinaturaPage,
});

const PLAN_ORDER: PlanSlug[] = ["starter", "pro", "elite"];

const STATUS_STYLE: Record<SubscriptionUiStatus, string> = {
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ativa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  atrasada: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  sem_assinatura: "bg-muted text-muted-foreground",
};

const PLAN_STYLE: Record<PlanSlug, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  pro: "bg-[var(--brand)]/15 text-[var(--brand)]",
  elite: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const FEATURE_ORDER: PlanFeatureKey[] = [
  "multiprofissional",
  "comissoes",
  "financeiro",
  "relatoriosAvancados",
  "fidelidade",
  "clubeAssinatura",
  "aiGrowth",
  "lembretesWhatsapp",
  "apiWebhooks",
];

function AssinaturaPage() {
  const { snapshot, invoices, hasBillingPortal, isLoading, refetch } = useSubscription();
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const openPortal = useServerFn(createBillingPortalSession);
  const cancelSub = useServerFn(cancelSubscriptionAtPeriodEnd);

  const portalMutation = useMutation({
    mutationFn: async () => {
      if (!snapshot) throw new Error("Assinatura não carregada.");
      const { url } = await openPortal({
        data: {
          companyId: snapshot.companyId,
          returnUrl: `${window.location.origin}/app/assinatura`,
        },
      });
      return url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Não foi possível abrir o portal de cobrança."),
  });

  const cancelMutation = useMutation({
    mutationFn: async (reactivate: boolean) => {
      if (!snapshot) throw new Error("Assinatura não carregada.");
      return cancelSub({ data: { companyId: snapshot.companyId, reactivate } });
    },
    onSuccess: (res) => {
      setCancelOpen(false);
      toast.success(
        res.cancelAtPeriodEnd
          ? "Assinatura será encerrada ao fim do período atual."
          : "Assinatura reativada com sucesso!",
      );
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["current-company"] });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível concluir a operação."),
  });

  if (isLoading || !snapshot) return <AssinaturaSkeleton />;

  const restantes =
    daysUntil(snapshot.status === "trial" ? snapshot.trialEndsAt : snapshot.currentPeriodEnd);
  const planIndex = PLAN_ORDER.indexOf(snapshot.planSlug);
  const canUpgrade = planIndex < PLAN_ORDER.length - 1;
  const canDowngrade = planIndex > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Minha Assinatura"
        description="Plano, cobrança e recursos liberados para a sua barbearia"
      />

      {/* Card principal */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${PLAN_STYLE[snapshot.planSlug]} border-0 text-sm px-3 py-1`}>
                  Plano {PLAN_LABEL[snapshot.planSlug]}
                </Badge>
                <Badge className={`${STATUS_STYLE[snapshot.status]} border-0`}>
                  {STATUS_LABEL[snapshot.status]}
                </Badge>
                {snapshot.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="border-red-300 text-red-600">
                    Cancelamento agendado
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {brl(snapshot.priceCents)}
                <span className="text-sm font-normal text-muted-foreground"> /mês</span>
              </p>
              {restantes !== null && (
                <p className="text-sm text-muted-foreground">
                  {restantes >= 0
                    ? `${restantes} dia${restantes === 1 ? "" : "s"} até ${snapshot.status === "trial" ? "o fim do trial" : "a próxima cobrança"}`
                    : "Período vencido — regularize a cobrança"}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <div className="rounded-xl bg-[var(--brand)]/10 p-3">
                <ShieldCheck className="w-8 h-8 text-[var(--brand)]" />
              </div>
            </div>
          </div>

          <Separator />

          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <Info label="Contratação" value={fmtDate(snapshot.startedAt)} />
            <Info label="Início do período" value={fmtDate(snapshot.currentPeriodStart)} />
            <Info label="Próxima cobrança" value={fmtDate(snapshot.currentPeriodEnd)} />
            <Info
              label="Renovação"
              value={
                snapshot.cancelAtPeriodEnd
                  ? "Não renova"
                  : fmtDate(snapshot.currentPeriodEnd)
              }
            />
            <Info
              label="Método de pagamento"
              value={
                snapshot.paymentMethod
                  ? `${(snapshot.paymentMethod.brand ?? "cartão").toUpperCase()} •••• ${snapshot.paymentMethod.last4 ?? "----"}`
                  : "Não informado"
              }
            />
            <Info label="Fim do trial" value={fmtDate(snapshot.trialEndsAt)} />
            <Info label="Origem do plano" value={snapshot.source === "subscription" ? "Assinatura Stripe" : "Cadastro da empresa"} />
            <Info label="Status no provedor" value={snapshot.providerStatus ?? "—"} />
          </dl>

          {isSuperAdmin && (
            <div className="rounded-lg bg-muted/60 p-3 text-xs font-mono break-all space-y-1">
              <p className="font-sans font-semibold text-muted-foreground">
                Somente administradores
              </p>
              <p>Customer ID: {snapshot.stripeCustomerId ?? "—"}</p>
              <p>Subscription ID: {snapshot.stripeSubscriptionId ?? "—"}</p>
            </div>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
              <Link to="/app/checkout">
                <Sparkles className="w-4 h-4 mr-1" /> Alterar plano
              </Link>
            </Button>
            {canUpgrade && (
              <Button variant="outline" asChild>
                <Link to="/app/checkout">
                  <ArrowUpRight className="w-4 h-4 mr-1" /> Fazer upgrade
                </Link>
              </Button>
            )}
            {canDowngrade && (
              <Button variant="outline" asChild>
                <Link to="/app/checkout">
                  <ArrowDownRight className="w-4 h-4 mr-1" /> Fazer downgrade
                </Link>
              </Button>
            )}
            {hasBillingPortal && (
              <>
                <Button
                  variant="outline"
                  disabled={portalMutation.isPending}
                  onClick={() => portalMutation.mutate()}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-1" />
                  )}
                  Atualizar cartão
                </Button>
                <Button
                  variant="outline"
                  disabled={portalMutation.isPending}
                  onClick={() => portalMutation.mutate()}
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> Billing Portal
                </Button>
              </>
            )}
            {snapshot.stripeSubscriptionId &&
              (snapshot.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(true)}
                >
                  Reativar assinatura
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar assinatura
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recursos do plano */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recursos do seu plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BASE_FEATURES.map((f) => (
              <Badge key={f} variant="secondary" className="font-normal">
                <Check className="w-3 h-3 mr-1" /> {f}
              </Badge>
            ))}
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {FEATURE_ORDER.map((key) => {
              const on = snapshot.features[key];
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                    on ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10" : "opacity-70"
                  }`}
                >
                  {on ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="min-w-0 truncate">{FEATURE_LABEL[key]}</span>
                </li>
              );
            })}
          </ul>
          {snapshot.planSlug !== "elite" && (
            <div className="rounded-lg border border-dashed p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-muted-foreground">
                Desbloqueie mais recursos a partir de{" "}
                {brl(PLAN_PRICE_CENTS[PLAN_ORDER[planIndex + 1] as PlanSlug])}/mês.
              </p>
              <Button size="sm" asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
                <Link to="/app/checkout">Ver planos</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Linha do tempo da assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l pl-4 space-y-4">
              <TimelineItem label="Conta criada" date={fmtDate(snapshot.startedAt)} />
              {snapshot.trialEndsAt && (
                <TimelineItem label="Fim do período de teste" date={fmtDate(snapshot.trialEndsAt)} />
              )}
              <TimelineItem
                label={`Plano ${PLAN_LABEL[snapshot.planSlug]} — ${STATUS_LABEL[snapshot.status]}`}
                date={fmtDate(snapshot.currentPeriodStart ?? snapshot.startedAt)}
                highlight
              />
              {snapshot.canceledAt && (
                <TimelineItem label="Cancelamento registrado" date={fmtDate(snapshot.canceledAt)} />
              )}
              {snapshot.currentPeriodEnd && (
                <TimelineItem
                  label={snapshot.cancelAtPeriodEnd ? "Encerramento previsto" : "Próxima renovação"}
                  date={fmtDate(snapshot.currentPeriodEnd)}
                />
              )}
            </ol>
          </CardContent>
        </Card>

        {/* Histórico de pagamentos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Histórico de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma fatura emitida ainda. Suas cobranças aparecerão aqui.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {inv.number ?? inv.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created).toLocaleDateString("pt-BR")} ·{" "}
                        {brl(inv.amountPaidCents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={inv.status === "paid" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {inv.status ?? "—"}
                      </Badge>
                      {inv.hostedUrl && (
                        <a
                          href={inv.hostedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Abrir fatura"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar assinatura?</DialogTitle>
            <DialogDescription>
              Seu acesso continua liberado até {fmtDate(snapshot.currentPeriodEnd)}. Depois disso o
              painel será bloqueado até uma nova contratação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Manter assinatura
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(false)}
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium truncate">{value}</dd>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  highlight,
}: {
  label: string;
  date: string;
  highlight?: boolean;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${
          highlight ? "bg-[var(--brand)]" : "bg-muted-foreground/40"
        }`}
      />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{date}</p>
    </li>
  );
}

function AssinaturaSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-9 w-full max-w-sm" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 grid sm:grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
