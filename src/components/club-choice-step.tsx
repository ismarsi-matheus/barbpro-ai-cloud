import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubAuthDialog } from "@/components/club-auth-dialog";
import {
  Crown,
  CreditCard,
  Check,
  Sparkles,
  CalendarClock,
  Wallet,
  ArrowRight,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ClubMembership = {
  id: string;
  club_plan_id: string;
  plano_nome: string;
  status: string;
  creditos_restantes: number;
  creditos_mensais: number;
  current_period_end: string | null;
};

export type ClubPlan = {
  id: string;
  nome: string;
  preco_cents: number;
  beneficios: any;
  creditos_mensais: number;
};

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/**
 * Etapa "Como deseja realizar seu agendamento?" do fluxo público de agendamento.
 * Card 1 = agendamento normal. Card 2 = assinante do Clube (login → assinatura → benefício).
 */
export function ClubChoiceStep({
  session,
  memberships,
  loadingMembership,
  plans,
  loadingPlans,
  servicePrice,
  onBack,
  onContinue,
}: {
  session: Session | null;
  memberships: ClubMembership[];
  loadingMembership: boolean;
  plans: ClubPlan[];
  loadingPlans: boolean;
  servicePrice: number;
  onBack: () => void;
  onContinue: (opts: { useClub: boolean; membership: ClubMembership | null }) => void;
}) {
  const [view, setView] = useState<"choice" | "club" | "plans">("choice");
  const [authOpen, setAuthOpen] = useState(false);

  const active = memberships.find(
    (m) =>
      m.status === "ativo" &&
      (!m.current_period_end || new Date(m.current_period_end) >= new Date()),
  );
  const expired = !active && memberships.find((m) => m.status !== "ativo" || m.current_period_end);
  const hasCredits = !!active && (active.creditos_restantes ?? 0) > 0;

  const openClub = () => {
    if (!session) {
      setAuthOpen(true);
      return;
    }
    setView("club");
  };

  if (view === "choice") {
    return (
      <>
        <Card className="animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle>Como deseja realizar seu agendamento?</CardTitle>
            <CardDescription>Escolha uma das opções abaixo para continuar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-5 flex flex-col hover:border-[var(--brand)] hover:shadow-md transition-all duration-200">
              <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5 text-foreground/70" />
              </div>
              <h3 className="font-semibold text-base">Agendamento Normal</h3>
              <p className="text-sm text-muted-foreground mt-1 flex-1">
                Pague normalmente pelo serviço.
              </p>
              <p className="text-lg font-bold mt-3">{formatBRL(servicePrice)}</p>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => onContinue({ useClub: false, membership: null })}
              >
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="rounded-xl border-2 border-[var(--brand)]/30 bg-[var(--brand)]/[0.03] p-5 flex flex-col hover:shadow-md transition-all duration-200 relative">
              <Badge className="absolute top-3 right-3 bg-[var(--brand)] text-white">Clube</Badge>
              <div className="w-11 h-11 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center mb-3">
                <Crown className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <h3 className="font-semibold text-base">Sou assinante do Clube</h3>
              <p className="text-sm text-muted-foreground mt-1 flex-1">
                Utilize seus benefícios do Clube.
              </p>
              <Button
                className="mt-3 w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                onClick={openClub}
              >
                {session ? "Continuar" : "Entrar"}
              </Button>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Voltar
            </Button>
          </CardContent>
        </Card>

        <ClubAuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          onAuthenticated={() => setView("club")}
        />
      </>
    );
  }

  if (view === "plans") {
    return (
      <Card className="animate-in fade-in-50 duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--brand)]" /> Planos do Clube
          </CardTitle>
          <CardDescription>Escolha o plano ideal e aproveite os benefícios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingPlans && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          )}
          {!loadingPlans && plans.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Gift className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Esta barbearia ainda não publicou planos do Clube.
              </p>
            </div>
          )}
          {plans.map((p) => {
            const beneficios: string[] = Array.isArray(p.beneficios) ? p.beneficios : [];
            return (
              <div
                key={p.id}
                className="rounded-xl border p-4 hover:border-[var(--brand)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{p.nome}</h4>
                    <p className="text-xs text-muted-foreground">
                      {p.creditos_mensais} benefício(s) por mês
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatBRL(p.preco_cents / 100)}</p>
                    <p className="text-[11px] text-muted-foreground">por mês</p>
                  </div>
                </div>
                {beneficios.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {beneficios.map((b, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Fale com a barbearia para ativar este plano.
                </p>
              </div>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setView("club")}>
              ← Voltar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => onContinue({ useClub: false, membership: null })}
            >
              Continuar sem o Clube
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // view === "club"
  return (
    <Card className="animate-in fade-in-50 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[var(--brand)]" /> Clube de Assinatura
        </CardTitle>
        <CardDescription>Sua assinatura nesta barbearia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingMembership && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        {!loadingMembership && !active && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed p-5 text-center space-y-2">
              <Gift className="w-10 h-10 mx-auto text-[var(--brand)]" />
              <p className="font-semibold">Você ainda não faz parte do Clube.</p>
              {expired && (
                <p className="text-xs text-amber-700 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sua assinatura anterior está inativa ou
                  vencida.
                </p>
              )}
              <ul className="text-sm text-muted-foreground text-left max-w-xs mx-auto space-y-1 pt-2">
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" /> Descontos exclusivos
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" /> Créditos mensais de serviços
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5" /> Prioridade no atendimento
                </li>
              </ul>
              <Button
                className="mt-2 bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                onClick={() => setView("plans")}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Assinar Clube
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onContinue({ useClub: false, membership: null })}
            >
              Continuar com agendamento normal
            </Button>
          </div>
        )}

        {!loadingMembership && active && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4 bg-[var(--brand)]/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="font-semibold">{active.plano_nome}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Ativo</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-background border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Saldo disponível
                  </p>
                  <p className="text-2xl font-bold">{active.creditos_restantes}</p>
                  <p className="text-[11px] text-muted-foreground">
                    de {active.creditos_mensais} benefício(s)/mês
                  </p>
                </div>
                <div className="rounded-lg bg-background border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" /> Próxima renovação
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {active.current_period_end
                      ? format(new Date(active.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">
                Deseja utilizar um benefício neste agendamento?
              </p>
              {!hasCredits && (
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Você não tem saldo disponível neste
                  período.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={!hasCredits}
                  className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                  onClick={() => onContinue({ useClub: true, membership: active })}
                >
                  Sim, usar benefício
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onContinue({ useClub: false, membership: active })}
                >
                  Não, pagar normal
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => setView("choice")}>
          ← Voltar
        </Button>
      </CardContent>
    </Card>
  );
}
