import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, subDays, startOfMonth, eachMonthOfInterval, subMonths, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";
import { TrendingUp, TrendingDown, Percent, Receipt, Download, Lock } from "lucide-react";
import { featureEnabled, normalizePlanSlug } from "@/lib/plan-features";

export const Route = createFileRoute("/app/relatorios")({ component: RelPage });

const COLORS = ["#1B3A4B", "#3b6fa0", "#5cbdb9", "#c9a84c", "#e85d3a", "#7c3aed"];

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function RelPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const planSlug = normalizePlanSlug((company as any)?.selected_plan_slug ?? (company as any)?.plano);
  const hasAdvanced = featureEnabled(planSlug, "relatoriosAvancados");

  // janela de comissões / ranking
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data } = useQuery({
    queryKey: ["reports", cid],
    enabled: !!cid,
    queryFn: async () => {
      const now = new Date();
      const since = subMonths(startOfMonth(now), 5);
      const [aptsRes, finRes] = await Promise.all([
        supabase.from("appointment")
          .select("scheduled_at, service_name, price, professional_name, status")
          .eq("company_id", cid!).gte("scheduled_at", since.toISOString()),
        supabase.from("financial_entry").select("type, amount, date")
          .eq("company_id", cid!).gte("date", format(since, "yyyy-MM-dd")),
      ]);
      const apts = aptsRes.data ?? [];
      const fin = finRes.data ?? [];

      const months = eachMonthOfInterval({ start: since, end: now });
      const byMonth = months.map((m) => {
        const k = format(m, "yyyy-MM");
        const revenue = fin.filter((f: any) => f.type === "entrada" && f.date.startsWith(k))
          .reduce((s: number, f: any) => s + Number(f.amount), 0);
        const expense = fin.filter((f: any) => f.type === "saida" && f.date.startsWith(k))
          .reduce((s: number, f: any) => s + Number(f.amount), 0);
        return { month: format(m, "MMM/yy", { locale: ptBR }), revenue, expense };
      });

      const cutoff30 = subDays(now, 30);
      const recent = apts.filter((a: any) => new Date(a.scheduled_at) >= cutoff30);
      const svcMap = new Map<string, number>();
      recent.forEach((a: any) => svcMap.set(a.service_name ?? "—", (svcMap.get(a.service_name ?? "—") ?? 0) + 1));
      const byService = Array.from(svcMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 6);

      const noShowByMonth = months.map((m) => {
        const k = format(m, "yyyy-MM");
        const ms = apts.filter((a: any) => a.scheduled_at.startsWith(k));
        const total = ms.length;
        const cancel = ms.filter((a: any) => a.status === "cancelado").length;
        return { month: format(m, "MMM/yy", { locale: ptBR }), rate: total ? Math.round((cancel / total) * 100) : 0 };
      });

      const totalRevenue30 = recent.filter((a: any) => a.status === "concluido")
        .reduce((s: number, a: any) => s + Number(a.price ?? 0), 0);
      const totalAttended = recent.filter((a: any) => a.status === "concluido").length;
      const totalNoShow = recent.filter((a: any) => a.status === "nao_compareceu").length;
      const totalConfirmed = recent.filter((a: any) => a.status === "confirmado").length;
      const noShowRate = recent.length ? totalNoShow / recent.length : 0;

      return { byMonth, byService, noShowByMonth, totalRevenue30, totalAttended, totalNoShow, totalConfirmed, noShowRate };
    },
  });

  // sales + sale_items no período
  const { data: salesData } = useQuery({
    queryKey: ["sales-window", cid, from, to],
    enabled: !!cid,
    queryFn: async () => {
      const fromIso = startOfDay(parseISO(from)).toISOString();
      const toIso = endOfDay(parseISO(to)).toISOString();
      const [salesRes, itemsRes, prosRes] = await Promise.all([
        supabase.from("sale").select("id, total_cents, status, closed_at, created_at")
          .eq("company_id", cid!).eq("status", "fechada")
          .gte("closed_at", fromIso).lt("closed_at", toIso),
        supabase.from("sale_item").select("id, preco_cents, quantidade, comissao_cents, professional_id, sale_id")
          .eq("company_id", cid!),
        supabase.from("professional").select("id, name").eq("company_id", cid!),
      ]);
      const sales = salesRes.data ?? [];
      const proName = new Map<string, string>();
      (prosRes.data ?? []).forEach((p: any) => proName.set(p.id, p.name));
      const saleIds = new Set(sales.map((s: any) => s.id));
      const items = (itemsRes.data ?? []).filter((i: any) => saleIds.has(i.sale_id));

      const ticketMedio = sales.length > 0
        ? sales.reduce((s: number, x: any) => s + (x.total_cents ?? 0), 0) / sales.length / 100
        : 0;
      const totalSales = sales.reduce((s: number, x: any) => s + (x.total_cents ?? 0), 0) / 100;

      // ranking por faturamento e comissão (por profissional, via itens)
      const fatByPro = new Map<string, number>();
      const comByPro = new Map<string, number>();
      for (const it of items as any[]) {
        const pid = it.professional_id ?? "—";
        fatByPro.set(pid, (fatByPro.get(pid) ?? 0) + it.preco_cents * it.quantidade);
        comByPro.set(pid, (comByPro.get(pid) ?? 0) + (it.comissao_cents ?? 0));
      }
      const rankFat = Array.from(fatByPro.entries())
        .map(([pid, cents]) => ({ pid, name: proName.get(pid) ?? "—", value: cents / 100 }))
        .sort((a, b) => b.value - a.value);
      const rankCom = Array.from(comByPro.entries())
        .map(([pid, cents]) => ({ pid, name: proName.get(pid) ?? "—", value: cents / 100 }))
        .sort((a, b) => b.value - a.value);

      return { sales, items, ticketMedio, totalSales, rankFat, rankCom };
    },
  });

  const exportComissoes = () => {
    const rows: (string | number)[][] = [["Profissional", "Comissão (R$)"]];
    (salesData?.rankCom ?? []).forEach((r) => rows.push([r.name, r.value.toFixed(2)]));
    rows.push(["TOTAL", (salesData?.rankCom ?? []).reduce((s, r) => s + r.value, 0).toFixed(2)]);
    downloadCsv(`comissoes_${from}_a_${to}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Visão geral e indicadores premium" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard variant="cinematic" tone="emerald" label="Faturamento 30d" value={formatBRL(data?.totalRevenue30)} icon={TrendingUp} />
        <KpiCard variant="cinematic" tone="brand" label="Atendimentos 30d" value={String(data?.totalAttended ?? 0)} icon={Receipt} />
        <KpiCard variant="cinematic" tone="violet" label="Confirmados 30d" value={String(data?.totalConfirmed ?? 0)} icon={Receipt} />
        <KpiCard variant="cinematic" tone="gold" label="Faltas 30d" value={String(data?.totalNoShow ?? 0)} icon={TrendingDown} />
        <KpiCard variant="cinematic" tone="rose" label="Taxa no-show" value={`${Math.round((data?.noShowRate ?? 0) * 100)}%`} icon={Percent} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento por mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={data?.byMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                  <Legend />
                  <Bar dataKey="revenue" name="Receita" fill="#1B3A4B" />
                  <Bar dataKey="expense" name="Despesa" fill="#e85d3a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top serviços (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data?.byService ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                    {(data?.byService ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de no-show por mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={data?.noShowByMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#e85d3a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ticket médio (período)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Faturado</p>
                <p className="text-2xl font-bold">{formatBRL(salesData?.totalSales ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Ticket médio ({(salesData?.sales.length ?? 0)} comandas)</p>
                <p className="text-2xl font-bold">{formatBRL(salesData?.ticketMedio ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avançados — gated por plano */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Indicadores avançados</h2>
          {!hasAdvanced && <Badge variant="outline"><Lock className="w-3 h-3 mr-1" /> Plano Pro ou superior</Badge>}
        </div>

        {!hasAdvanced ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            Faça upgrade para liberar ranking de barbeiros, comissões a pagar e exportação CSV.
          </CardContent></Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking de barbeiros — faturamento ({from} a {to})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={salesData?.rankFat ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                      <Bar dataKey="value" fill="#1B3A4B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Comissões a pagar ({from} a {to})</CardTitle>
                <Button size="sm" variant="outline" onClick={exportComissoes}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {(salesData?.rankCom ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Sem comissões no período.</p>
                  )}
                  {(salesData?.rankCom ?? []).map((r) => (
                    <div key={r.pid} className="flex items-center justify-between border rounded-md p-2 text-sm">
                      <span>{r.name}</span>
                      <span className="font-semibold">{formatBRL(r.value)}</span>
                    </div>
                  ))}
                  {(salesData?.rankCom?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between border-t pt-2 mt-2 font-bold">
                      <span>Total</span>
                      <span>{formatBRL((salesData?.rankCom ?? []).reduce((s, r) => s + r.value, 0))}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
