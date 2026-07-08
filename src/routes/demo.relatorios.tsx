import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { demoFinancials } from "@/lib/demo-seed";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Sparkles, Percent } from "lucide-react";

const PIE = ["#1B3A4B", "#3b6fa0", "#5cbdb9", "#c9a84c", "#e85d3a", "#7c3aed"];

export const Route = createFileRoute("/demo/relatorios")({
  component: () => {
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      const key = format(d, "yyyy-MM-dd");
      const label = format(d, "dd/MM", { locale: ptBR });
      const rev = demoFinancials
        .filter((f) => f.type === "entrada" && f.date === key)
        .reduce((s, f) => s + f.amount, 0);
      const exp = demoFinancials
        .filter((f) => f.type === "saida" && f.date === key)
        .reduce((s, f) => s + f.amount, 0);
      return { day: label, Receita: rev, Despesa: exp };
    });
    const totRev = days.reduce((s, d) => s + d.Receita, 0);
    const totExp = days.reduce((s, d) => s + d.Despesa, 0);
    const margin = totRev ? ((totRev - totExp) / totRev) * 100 : 0;
    const ticketAvg = totRev / 30;

    const byCat = (() => {
      const m = new Map<string, number>();
      demoFinancials
        .filter((f) => f.type === "entrada")
        .forEach((f) => m.set(f.category, (m.get(f.category) ?? 0) + f.amount));
      return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
    })();

    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" description="Visão cinematográfica dos últimos 30 dias" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard variant="cinematic" tone="emerald" label="Receita 30d" value={formatBRL(totRev)} icon={TrendingUp} delta={{ value: 14.6 }} />
          <KpiCard variant="cinematic" tone="rose" label="Despesas 30d" value={formatBRL(totExp)} icon={TrendingDown} delta={{ value: -3.4, positiveIsGood: false }} />
          <KpiCard variant="cinematic" tone="brand" label="Saldo 30d" value={formatBRL(totRev - totExp)} icon={Wallet} />
          <KpiCard variant="cinematic" tone="gold" label="Margem" value={`${margin.toFixed(1)}%`} icon={Percent} hint={`média diária ${formatBRL(ticketAvg)}`} />
        </div>

        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(200 60% 40% / 0.25), transparent 70%)" }}
          />
          <CardHeader className="flex flex-row items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--gradient-brand)" }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <CardTitle className="text-base">Fluxo diário — receita x despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <AreaChart data={days}>
                  <defs>
                    <linearGradient id="demoRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="demoExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e85d3a" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#e85d3a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 18px 48px -18px rgba(27,58,75,0.32)" }}
                    formatter={(v: any) => formatBRL(Number(v))}
                  />
                  <Area type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2} fill="url(#demoRev)" />
                  <Area type="monotone" dataKey="Despesa" stroke="#e85d3a" strokeWidth={2} fill="url(#demoExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Receita diária (barras)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Bar dataKey="Receita" fill="url(#demoRev)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Receita por categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} stroke="white" strokeWidth={3}>
                      {byCat.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
});
