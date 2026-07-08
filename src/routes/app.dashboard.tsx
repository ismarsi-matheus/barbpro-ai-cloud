import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { BookingLinkCard } from "@/components/booking-link-card";
import { KpiCard } from "@/components/kpi-card";
import {
  CalendarDays, DollarSign, Users, TrendingDown, TrendingUp,
  Percent, Receipt, AlertTriangle, Sparkles, ArrowRight, X, Zap, Star,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  format, subDays, parseISO,
} from "date-fns";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

const PIE_COLORS = ["#1B3A4B", "#2C5870", "#3F7A95", "#6BA3BD", "#A3CCDE"];

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-700 border-blue-200",
  confirmado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  em_atendimento: "bg-yellow-100 text-yellow-700 border-yellow-200",
  concluido: "bg-gray-100 text-gray-700 border-gray-200",
  faltou: "bg-orange-100 text-orange-700 border-orange-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

function Dashboard() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;

  const { data } = useQuery({
    queryKey: ["dashboard-rich", cid],
    enabled: !!cid,
    queryFn: async () => {
      const today = new Date();
      const [todayApts, monthApts, fin, customers] = await Promise.all([
        supabase.from("appointment").select("id, scheduled_at, service_name, professional_name, customer_name, status, price")
          .eq("company_id", cid!)
          .gte("scheduled_at", startOfDay(today).toISOString())
          .lte("scheduled_at", endOfDay(today).toISOString())
          .order("scheduled_at"),
        supabase.from("appointment").select("id, scheduled_at, price, status, service_name, professional_name")
          .eq("company_id", cid!)
          .gte("scheduled_at", startOfMonth(today).toISOString())
          .lte("scheduled_at", endOfMonth(today).toISOString()),
        supabase.from("financial_entry").select("amount, type, date")
          .eq("company_id", cid!)
          .gte("date", format(startOfMonth(today), "yyyy-MM-dd"))
          .lte("date", format(endOfMonth(today), "yyyy-MM-dd")),
        supabase.from("customer").select("id, status, last_appointment_at").eq("company_id", cid!),
      ]);

      const m = monthApts.data ?? [];
      const concluidos = m.filter((a: any) => a.status === "concluido");
      const cancelados = m.filter((a: any) => a.status === "cancelado");
      const faturamentoMes = concluidos.reduce((s: number, a: any) => s + Number(a.price ?? 0), 0);
      const ticketMedio = concluidos.length ? faturamentoMes / concluidos.length : 0;
      const noShowRate = m.length ? cancelados.length / m.length : 0;

      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const weekCount = m.filter((a: any) => {
        const d = parseISO(a.scheduled_at);
        return d >= weekStart && d <= weekEnd;
      }).length;

      const chart = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(today, 13 - i); d.setHours(0, 0, 0, 0);
        const day = format(d, "dd/MM");
        const count = m.filter((a: any) => {
          const ad = parseISO(a.scheduled_at); ad.setHours(0, 0, 0, 0);
          return ad.getTime() === d.getTime();
        }).length;
        return { day, count };
      });

      const svcCounts = new Map<string, number>();
      m.forEach((a: any) => a.service_name && svcCounts.set(a.service_name, (svcCounts.get(a.service_name) ?? 0) + 1));
      const pieData = Array.from(svcCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5);

      const proRevenue = new Map<string, number>();
      concluidos.forEach((a: any) => {
        const k = a.professional_name ?? "—";
        proRevenue.set(k, (proRevenue.get(k) ?? 0) + Number(a.price ?? 0));
      });
      const topPros = Array.from(proRevenue.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5);

      const inactives = (customers.data ?? []).filter(
        (c: any) => c.last_appointment_at && parseISO(c.last_appointment_at) < subDays(today, 60),
      ).length;

      const insights = [
        inactives > 0 && {
          title: `${inactives} clientes sem agendar há +60 dias`,
          impact: inactives * 80,
          priority: "alta",
        },
        cancelados.length > 0 && {
          title: `${cancelados.length} cancelamentos esse mês`,
          impact: cancelados.length * 50,
          priority: "media",
        },
        topPros.length > 0 && {
          title: `Top profissional: ${topPros[0].name}`,
          impact: 0,
          priority: "baixa",
        },
      ].filter(Boolean) as { title: string; impact: number; priority: string }[];

      return {
        todayCount: todayApts.data?.length ?? 0,
        weekCount,
        monthCount: m.length,
        faturamentoMes,
        ticketMedio,
        activeCustomers: (customers.data ?? []).filter((c: any) => c.status === "active").length,
        noShowRate,
        taxaOcupacao: Math.min(1, m.reduce((s: number) => s + 0.5, 0) / 350),
        chart,
        pieData,
        topPros,
        insights,
        todayApts: todayApts.data ?? [],
      };
    },
  });

  const [dismissed, setDismissed] = useState<string[]>([]);
  const alerts = useMemo(() => {
    const list: { id: string; level: "high" | "medium"; icon: any; title: string; desc: string; href: string }[] = [];
    const noShow = data?.noShowRate ?? 0;
    if (noShow > 0.15) list.push({
      id: "no-show", level: "high", icon: AlertTriangle,
      title: `Taxa de cancelamento alta: ${Math.round(noShow * 100)}%`,
      desc: "Revise confirmações e dispare lembretes para reduzir faltas.",
      href: "/app/agenda",
    });
    const pendentes = (data?.todayApts ?? []).filter((a: any) => a.status === "agendado").length;
    if (pendentes >= 2) list.push({
      id: "pendentes", level: "high", icon: AlertTriangle,
      title: `${pendentes} agendamentos sem confirmação hoje`,
      desc: "Considere disparar lembretes para reduzir no-show.",
      href: "/app/agenda",
    });
    const inativosInsight = (data?.insights ?? []).find((i: any) => i.title?.includes("sem agendar"));
    if (inativosInsight) list.push({
      id: "inativos", level: "medium", icon: Star,
      title: inativosInsight.title,
      desc: "Disparar reativação pode recuperar receita esse mês.",
      href: "/app/aigrowth",
    });
    return list.filter((a) => !dismissed.includes(a.id));
  }, [data, dismissed]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Olá, ${company?.nome_fantasia || company?.name || ""}`} />

      {alerts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {alerts.map((al) => {
            const Icon = al.icon;
            const isHigh = al.level === "high";
            const cls = isHigh ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
            const iconCls = isHigh ? "text-red-500" : "text-amber-500";
            return (
              <div key={al.id} className={`${cls} border rounded-xl p-4 flex items-start gap-3`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{al.title}</p>
                  <p className="text-xs text-black/60 mt-0.5">{al.desc}</p>
                  <Link to={al.href} className="text-xs font-medium mt-1 inline-block text-[var(--brand)]">
                    Ver agora →
                  </Link>
                </div>
                <button onClick={() => setDismissed((d) => [...d, al.id])} className="text-black/40 hover:text-black/70 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard variant="cinematic" tone="brand" label="Agendamentos hoje" value={String(data?.todayCount ?? 0)} icon={CalendarDays} />
            <KpiCard variant="cinematic" tone="violet" label="Atendimentos mês" value={String(data?.monthCount ?? 0)} icon={Receipt} />
            <KpiCard variant="cinematic" tone="emerald" label="Faturamento mês" value={formatBRL(data?.faturamentoMes)} icon={DollarSign} />
            <KpiCard variant="cinematic" tone="gold" label="Ticket médio" value={formatBRL(data?.ticketMedio)} icon={TrendingUp} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard tone="brand" label="Agendamentos semana" value={String(data?.weekCount ?? 0)} icon={CalendarDays} />
            <KpiCard tone="emerald" label="Clientes ativos" value={String(data?.activeCustomers ?? 0)} icon={Users} />
            <KpiCard tone="violet" label="Taxa de ocupação" value={`${Math.round((data?.taxaOcupacao ?? 0) * 100)}%`} icon={Percent} />
            <KpiCard tone="rose" label="Taxa cancelamento" value={`${Math.round((data?.noShowRate ?? 0) * 100)}%`} icon={TrendingDown} />
          </div>
          <ClubMrrCard cid={cid} />
        </div>
        <div className="lg:col-span-1">
          <BookingLinkCard className="h-full" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Agendamentos — últimos 14 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={data?.chart ?? []}>
                  <defs>
                    <linearGradient id="g-app" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3A4B" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#1B3A4B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#1B3A4B" fill="url(#g-app)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 serviços do mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {(data?.pieData?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados ainda.</p>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data!.pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {data!.pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Faturamento por profissional</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {(data?.topPros?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados ainda.</p>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={data!.topPros} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Bar dataKey="value" fill="#1B3A4B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[var(--brand)]/5 to-transparent border-[var(--brand)]/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand)]" />
            <CardTitle className="text-base">Sugestões da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.insights ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Sem sugestões hoje. 🎉</p>
            )}
            {(data?.insights ?? []).map((ins, i) => (
              <div key={i} className="p-3 rounded-md bg-white border border-border/60">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${ins.priority === "alta" ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{ins.title}</p>
                    {ins.impact > 0 && (
                      <p className="text-xs text-[var(--brand)] font-semibold mt-1">
                        Impacto: +{formatBRL(ins.impact)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Link to="/app/aigrowth" className="block text-center text-sm text-[var(--brand)] hover:underline font-medium pt-1">
              Ver todos os insights →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Próximos atendimentos hoje</CardTitle>
          <Link to="/app/agenda" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1">
            Ver agenda <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {(data?.todayApts.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum atendimento hoje.</p>
          ) : (
            <div className="space-y-2">
              {data!.todayApts.slice(0, 8).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-md border border-border/60">
                  <div className="text-center min-w-[52px]">
                    <div className="font-bold text-[var(--brand)]">{format(parseISO(a.scheduled_at), "HH:mm")}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.service_name} • {a.professional_name}</div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status] ?? ""}`}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClubMrrCard({ cid }: { cid?: string }) {
  const { data } = useQuery({
    queryKey: ["club-mrr", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data } = await supabase.from("club_member")
        .select("status, club_plan:club_plan_id(preco_cents)")
        .eq("company_id", cid!).eq("status", "ativo");
      const arr = (data ?? []) as any[];
      const mrr = arr.reduce((s, m) => s + (m.club_plan?.preco_cents ?? 0), 0) / 100;
      return { mrr, count: arr.length };
    },
  });
  if (!data || data.count === 0) return null;
  return (
    <div className="rounded-lg border bg-gradient-to-r from-amber-50 to-amber-100 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-amber-800 uppercase tracking-wide font-semibold">Receita recorrente do Clube</p>
        <p className="text-2xl font-bold text-amber-900">{formatBRL(data.mrr)}<span className="text-sm font-normal text-amber-700"> /mês</span></p>
        <p className="text-xs text-amber-700">{data.count} assinante{data.count > 1 ? "s" : ""} ativo{data.count > 1 ? "s" : ""}</p>
      </div>
      <a href="/app/clube" className="text-sm text-amber-900 underline">Gerenciar clube →</a>
    </div>
  );
}
