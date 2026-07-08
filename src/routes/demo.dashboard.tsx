import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import {
  CalendarDays, DollarSign, Users, TrendingDown, TrendingUp,
  Percent, Receipt, AlertTriangle, Sparkles, ArrowRight, X, Zap, Star,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  demoKpis, demoTopServices, demoWeeklyChart, demoAppointments, demoAIInsights,
} from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO, isToday } from "date-fns";
import { BookingLinkCardDemo } from "@/components/booking-link-card-demo";

export const Route = createFileRoute("/demo/dashboard")({ component: DemoDash });

const PIE_COLORS = ["#1B3A4B", "#2C5870", "#3F7A95", "#6BA3BD", "#A3CCDE"];

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-700 border-blue-200",
  confirmado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  em_atendimento: "bg-yellow-100 text-yellow-700 border-yellow-200",
  concluido: "bg-gray-100 text-gray-700 border-gray-200",
  faltou: "bg-orange-100 text-orange-700 border-orange-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

const ALERTS = [
  {
    id: "al1", level: "high", icon: AlertTriangle,
    title: "Taxa de cancelamento alta hoje: 23%",
    desc: "3 cancelamentos/faltas em 13 agendamentos. Revise confirmações.",
    href: "/demo/agenda",
  },
  {
    id: "al2", level: "high", icon: AlertTriangle,
    title: "2 agendamentos sem confirmação há +2h",
    desc: "Cliente não confirmou. Considere disparar lembrete WhatsApp.",
    href: "/demo/agenda",
  },
  {
    id: "al3", level: "medium", icon: Star,
    title: "8 clientes VIP sem retorno há +21 dias",
    desc: "Disparar reativação pode recuperar até R$ 2.400 esse mês.",
    href: "/demo/aigrowth",
  },
  {
    id: "al4", level: "medium", icon: Zap,
    title: "Hidratação Capilar com zero agendamentos no mês",
    desc: "Considere criar combo com Corte Premium ou promoção.",
    href: "/demo/aigrowth",
  },
];

function DemoDash() {
  const k = demoKpis();
  const chart = demoWeeklyChart();
  const pieData = demoTopServices();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const alerts = ALERTS.filter((a) => !dismissed.includes(a.id));
  const todayApts = demoAppointments
    .filter((a) => isToday(parseISO(a.scheduled_at)))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral — Barbearia Excellence" />

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {alerts.map((al) => {
            const Icon = al.icon;
            const isHigh = al.level === "high";
            const cls = isHigh
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200";
            const iconCls = isHigh ? "text-red-500" : "text-amber-500";
            return (
              <div key={al.id} className={`${cls} border rounded-xl p-4 flex items-start gap-3`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{al.title}</p>
                  <p className="text-xs text-black/60 mt-0.5">{al.desc}</p>
                  <Link to={al.href as any} className="text-xs font-medium mt-1 inline-block" style={{ color: "#1B3A4B" }}>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard variant="cinematic" tone="brand" label="Agendamentos hoje" value={String(k.todayAppointments)} icon={CalendarDays} delta={{ value: 8.3 }} />
        <KpiCard variant="cinematic" tone="violet" label="Atendimentos mês" value={String(k.monthAppointments)} icon={Receipt} delta={{ value: 12.1 }} />
        <KpiCard variant="cinematic" tone="emerald" label="Faturamento mês" value={formatBRL(k.faturamentoMes)} icon={DollarSign} delta={{ value: 14.6 }} />
        <KpiCard variant="cinematic" tone="gold" label="Ticket médio" value={formatBRL(k.ticketMedio)} icon={TrendingUp} delta={{ value: 3.2 }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard tone="brand" label="Agendamentos semana" value={String(k.weekAppointments)} icon={CalendarDays} />
        <KpiCard tone="emerald" label="Clientes ativos" value={String(k.activeCustomers)} icon={Users} />
        <KpiCard tone="violet" label="Taxa de ocupação" value={`${Math.round(k.taxaOcupacao * 100)}%`} icon={Percent} />
        <KpiCard tone="rose" label="Taxa cancelamento" value={`${Math.round(k.noShowRate * 100)}%`} icon={TrendingDown} delta={{ value: -2.1, positiveIsGood: false }} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Agendamentos — últimos 14 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="gDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3A4B" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#1B3A4B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#1B3A4B" fill="url(#gDash)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 serviços</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos atendimentos hoje</CardTitle>
            <Link to="/demo/agenda" className="text-xs hover:underline flex items-center gap-1" style={{ color: "#1B3A4B" }}>
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {todayApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum atendimento hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayApts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-md border border-black/5">
                    <div className="text-center min-w-[52px]">
                      <div className="font-bold" style={{ color: "#1B3A4B" }}>{format(parseISO(a.scheduled_at), "HH:mm")}</div>
                      <div className="text-[10px] text-black/50">{a.duration_minutes}min</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{a.customer_name}</div>
                      <div className="text-xs text-black/60 truncate">{a.service_name} • {a.professional_name}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status] ?? ""}`}>
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[var(--brand)]/5 to-transparent border-[var(--brand)]/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#1B3A4B" }} />
            <CardTitle className="text-base">Sugestões da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoAIInsights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="p-3 rounded-md bg-white border border-black/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${ins.priority === "alta" ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{ins.title}</p>
                    {ins.impact_estimate > 0 && (
                      <p className="text-xs font-semibold mt-1" style={{ color: "#1B3A4B" }}>
                        Impacto: +{formatBRL(ins.impact_estimate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Link to="/demo/aigrowth">
              <Button className="w-full text-white" style={{ backgroundColor: "#1B3A4B" }}>
                Ver todos os insights ({demoAIInsights.length})
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <BookingLinkCardDemo className="lg:col-span-1" />
      </div>
    </div>
  );
}
