import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, TrendingUp, Calendar, Users, ArrowRight } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { subDays, startOfMonth } from "date-fns";

export const Route = createFileRoute("/app/aigrowth")({ component: AIPage });

const ICONS: Record<string, any> = {
  reativacao: Users,
  performance: AlertTriangle,
  demanda: TrendingUp,
  ocupacao: Calendar,
};

function AIPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;

  const { data: insights = [] } = useQuery({
    queryKey: ["ai-insights", cid],
    enabled: !!cid,
    queryFn: async () => {
      const cutoff60 = subDays(new Date(), 60).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const [{ count: inactives }, { data: monthApts }, { data: pros }] = await Promise.all([
        supabase.from("customer").select("id", { count: "exact", head: true })
          .eq("company_id", cid!).lt("last_appointment_at", cutoff60),
        supabase.from("appointment").select("status, professional_name, service_name, scheduled_at")
          .eq("company_id", cid!).gte("scheduled_at", monthStart),
        supabase.from("professional").select("id, name").eq("company_id", cid!).eq("active", true),
      ]);

      const apts = monthApts ?? [];
      const cancel = apts.filter((a: any) => a.status === "cancelado").length;
      const cancelRate = apts.length ? cancel / apts.length : 0;

      const svcCounts = new Map<string, number>();
      apts.forEach((a: any) => svcCounts.set(a.service_name ?? "—", (svcCounts.get(a.service_name ?? "—") ?? 0) + 1));
      const lowDemand = Array.from(svcCounts.entries()).filter(([, v]) => v <= 2).slice(0, 1)[0];

      const result: any[] = [];
      if ((inactives ?? 0) > 0) {
        result.push({
          id: "i1", type: "reativacao", priority: "alta",
          title: `${inactives} clientes sem agendar há +60 dias`,
          description: "Disparar campanha de reativação por WhatsApp pode recuperar uma boa parte desse público.",
          impact_estimate: (inactives ?? 0) * 80,
          action_label: "Criar campanha",
        });
      }
      if (cancel > 0) {
        result.push({
          id: "i2", type: "performance", priority: cancelRate > 0.15 ? "alta" : "media",
          title: `${cancel} cancelamentos esse mês (${Math.round(cancelRate * 100)}%)`,
          description: "Ative confirmação automática 24h antes para reduzir cancelamentos e no-show.",
          impact_estimate: cancel * 50,
          action_label: "Ativar lembretes",
        });
      }
      if (lowDemand) {
        result.push({
          id: "i3", type: "demanda", priority: "baixa",
          title: `Serviço '${lowDemand[0]}' com baixa demanda`,
          description: `Apenas ${lowDemand[1]} agendamento(s) no mês. Crie um combo ou promoção pra esquentar.`,
          impact_estimate: 0,
          action_label: "Criar promoção",
        });
      }
      result.push({
        id: "i4", type: "ocupacao", priority: "media",
        title: "Horários de baixa ocupação 14h–16h",
        description: `Oferta 'Happy Hour' nesse período pode aumentar a receita com ${(pros ?? []).length} profissionais ativos.`,
        impact_estimate: 800,
        action_label: "Criar oferta",
      });
      return result;
    },
  });

  const totalImpact = insights.reduce((s, i) => s + i.impact_estimate, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Growth"
        description="Sua IA olha os dados da barbearia e sugere ações pra crescer."
      />

      <Card className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-mid)] text-white border-0">
        <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Oportunidade estimada esse mês</p>
              <p className="text-3xl font-bold">{formatBRL(totalImpact)}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => toast.success("Disparando todas as ações sugeridas…")}>
            Executar todas as ações
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const Icon = ICONS[ins.type] ?? Sparkles;
          const priorityColor = ins.priority === "alta" ? "bg-red-100 text-red-700"
            : ins.priority === "media" ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-700";
          return (
            <Card key={ins.id}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[var(--brand)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{ins.title}</CardTitle>
                    <Badge className={`${priorityColor} border-0 shrink-0`}>{ins.priority}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{ins.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  {ins.impact_estimate > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Impacto estimado</p>
                      <p className="font-bold text-[var(--brand)]">+{formatBRL(ins.impact_estimate)}</p>
                    </div>
                  ) : <div />}
                  <Button size="sm" onClick={() => toast.success(`Ação '${ins.action_label}' iniciada`)}>
                    {ins.action_label} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
