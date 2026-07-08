import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Building2, TrendingUp, UserPlus, XCircle } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { startOfMonth, subMonths } from "date-fns";

export const Route = createFileRoute("/master/painel")({ component: MasterPanel });

function MasterPanel() {
  const { data } = useQuery({
    queryKey: ["master-painel"],
    queryFn: async () => {
      const { data: companies } = await supabase.from("company").select("id, status_cobranca, valor_mensal, created_at");
      const all = companies ?? [];
      const active = all.filter((c: any) => c.status_cobranca === "ativo" || c.status_cobranca === "trial");
      const mrr = all.filter((c: any) => c.status_cobranca === "ativo").reduce((s: number, c: any) => s + Number(c.valor_mensal ?? 0), 0);
      const m0 = startOfMonth(new Date()).toISOString();
      const newThisMonth = all.filter((c: any) => c.created_at >= m0).length;
      const churn = all.filter((c: any) => c.status_cobranca === "cancelado").length;
      return { total: all.length, active: active.length, mrr, newThisMonth, churn };
    },
  });
  return (
    <div>
      <PageHeader title="Painel Master" description="Visão geral de todas as barbearias" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={formatBRL(data?.mrr)} icon={TrendingUp} />
        <KpiCard label="Ativas" value={String(data?.active ?? 0)} hint={`${data?.total ?? 0} no total`} icon={Building2} />
        <KpiCard label="Novas no mês" value={String(data?.newThisMonth ?? 0)} icon={UserPlus} />
        <KpiCard label="Canceladas" value={String(data?.churn ?? 0)} icon={XCircle} />
      </div>
    </div>
  );
}
