import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { demoFinancials } from "@/lib/demo-seed";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  Receipt,
  PiggyBank,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const EXPENSE_COLORS = ["#e85d3a", "#c9a84c", "#7c3aed", "#3b6fa0", "#5cbdb9", "#1B3A4B"];

export const Route = createFileRoute("/demo/financeiro")({
  component: DemoFin,
});

function DemoFin() {
  const totals = useMemo(
    () =>
      demoFinancials.reduce(
        (acc, e) => {
          if (e.type === "entrada") acc.income += e.amount;
          else acc.exp += e.amount;
          return acc;
        },
        { income: 0, exp: 0 },
      ),
    [],
  );
  const margin = totals.income > 0 ? ((totals.income - totals.exp) / totals.income) * 100 : 0;

  // 30-day cashflow
  const cashflow = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return eachDayOfInterval({ start, end }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const dayEntries = demoFinancials.filter((f) => f.date === key);
      const inc = dayEntries.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
      const exp = dayEntries.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
      return {
        day: format(d, "dd/MM"),
        Receita: inc,
        Despesa: exp,
        Saldo: inc - exp,
      };
    });
  }, []);

  // Expenses by category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    demoFinancials
      .filter((f) => f.type === "saida")
      .forEach((f) => map.set(f.category, (map.get(f.category) ?? 0) + f.amount));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const topRevenueDays = useMemo(() => {
    return [...cashflow]
      .sort((a, b) => b.Receita - a.Receita)
      .slice(0, 5);
  }, [cashflow]);

  const entradas = demoFinancials.filter((e) => e.type === "entrada");
  const saidas = demoFinancials.filter((e) => e.type === "saida");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Visão cinematográfica do caixa, margens e tendências"
      />

      {/* Cinematic KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          variant="cinematic"
          tone="emerald"
          label="Receitas"
          value={formatBRL(totals.income)}
          icon={TrendingUp}
          delta={{ value: 12.4, positiveIsGood: true }}
          hint="vs. mês anterior"
        />
        <KpiCard
          variant="cinematic"
          tone="rose"
          label="Despesas"
          value={formatBRL(totals.exp)}
          icon={TrendingDown}
          delta={{ value: -3.2, positiveIsGood: false }}
          hint="vs. mês anterior"
        />
        <KpiCard
          variant="cinematic"
          tone="brand"
          label="Saldo líquido"
          value={formatBRL(totals.income - totals.exp)}
          icon={Wallet}
          delta={{ value: 18.7 }}
          hint="lucro do período"
        />
        <KpiCard
          variant="cinematic"
          tone="gold"
          label="Margem"
          value={`${margin.toFixed(1)}%`}
          icon={PiggyBank}
          hint="saúde do negócio"
        />
      </div>

      {/* Cashflow cinematic chart */}
      <Card className="relative overflow-hidden border-border/60 shadow-[var(--shadow-soft)]">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(200 60% 40% / 0.25), transparent 70%)" }}
        />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">Fluxo de caixa — últimos 30 dias</CardTitle>
              <p className="text-xs text-muted-foreground">Receita, despesa e saldo diário</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={cashflow} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e85d3a" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#e85d3a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B3A4B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#1B3A4B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 18px 48px -18px rgba(27,58,75,0.32)",
                  }}
                  formatter={(v: any) => formatBRL(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="Receita"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gRev)"
                />
                <Area
                  type="monotone"
                  dataKey="Despesa"
                  stroke="#e85d3a"
                  strokeWidth={2}
                  fill="url(#gExp)"
                />
                <Area
                  type="monotone"
                  dataKey="Saldo"
                  stroke="#1B3A4B"
                  strokeWidth={2.5}
                  fill="url(#gBal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribution + top days */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
            <p className="text-xs text-muted-foreground">
              Onde seu dinheiro está sendo investido
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    stroke="white"
                    strokeWidth={3}
                  >
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 18px 48px -18px rgba(27,58,75,0.32)",
                    }}
                    formatter={(v: any) => formatBRL(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(38 88% 60% / 0.25), transparent 70%)" }}
          />
          <CardHeader className="flex flex-row items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-base">Melhores dias do mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRevenueDays.map((d, i) => (
              <div
                key={d.day}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/70 to-white border border-amber-100/60"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "var(--gradient-gold)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{d.day}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Saldo {formatBRL(d.Saldo)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-600 tabular-nums">
                  {formatBRL(d.Receita)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bar comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo diário (Receita x Despesa)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={cashflow.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                <Legend />
                <Bar dataKey="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Despesa" fill="#e85d3a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tables */}
      <Tabs defaultValue="receitas">
        <TabsList>
          <TabsTrigger value="receitas">Receitas ({entradas.length})</TabsTrigger>
          <TabsTrigger value="despesas">Despesas ({saidas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="receitas" className="pt-4">
          <DataTable
            data={entradas}
            searchableKeys={["description", "category"]}
            columns={[
              {
                key: "date",
                header: "Data",
                render: (r) => format(parseISO(r.date), "dd MMM", { locale: ptBR }),
              },
              { key: "category", header: "Categoria" },
              { key: "description", header: "Descrição" },
              {
                key: "amount",
                header: "Valor",
                render: (r) => (
                  <span className="text-emerald-600 font-semibold tabular-nums">
                    {formatBRL(r.amount)}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="despesas" className="pt-4">
          <DataTable
            data={saidas}
            searchableKeys={["description", "category"]}
            columns={[
              {
                key: "date",
                header: "Data",
                render: (r) => format(parseISO(r.date), "dd MMM", { locale: ptBR }),
              },
              { key: "category", header: "Categoria" },
              { key: "description", header: "Descrição" },
              {
                key: "amount",
                header: "Valor",
                render: (r) => (
                  <span className="text-rose-600 font-semibold tabular-nums">
                    {formatBRL(r.amount)}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
