import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Percent, Sparkles, PiggyBank } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { format, startOfMonth, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/financeiro")({ component: FinPage });

function FinPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "entrada", amount: 0, date: format(new Date(), "yyyy-MM-dd"), description: "", category: "",
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["financial", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("financial_entry").select("*").eq("company_id", cid!)
        .order("date", { ascending: false })).data ?? [],
  });

  const { data: monthApts = [] } = useQuery({
    queryKey: ["fin-apts-month", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("appointment").select("id, professional_name, price, status, scheduled_at")
        .eq("company_id", cid!).eq("status", "concluido")
        .gte("scheduled_at", startOfMonth(new Date()).toISOString())).data ?? [],
  });

  const { data: pros = [] } = useQuery({
    queryKey: ["pros-fin", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("professional").select("id, name, commission_type, commission_value")
        .eq("company_id", cid!)).data ?? [],
  });

  const totals = (entries as any[]).reduce((acc, e) => {
    if (e.type === "entrada") acc.income += Number(e.amount);
    else acc.exp += Number(e.amount);
    return acc;
  }, { income: 0, exp: 0 });

  const commissions = useMemo(() => {
    const map = new Map<string, { revenue: number; commission: number; count: number }>();
    (pros as any[]).forEach((p) => map.set(p.name, { revenue: 0, commission: 0, count: 0 }));
    (monthApts as any[]).forEach((a) => {
      const p = (pros as any[]).find((x) => x.name === a.professional_name);
      if (!p) return;
      const rec = map.get(p.name)!;
      const price = Number(a.price ?? 0);
      rec.revenue += price; rec.count += 1;
      const v = Number(p.commission_value ?? 0);
      rec.commission += p.commission_type === "fixed" ? v : price * (v / 100);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [pros, monthApts]);

  const totalCommission = commissions.reduce((s, c) => s + c.commission, 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("Sem empresa");
      const { error } = await supabase.from("financial_entry").insert({ ...form, company_id: cid } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financial", cid] }); setOpen(false); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("financial_entry").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financial", cid] }),
  });

  const entradas = (entries as any[]).filter((e) => e.type === "entrada");
  const saidas = (entries as any[]).filter((e) => e.type === "saida");

  // 30-day cashflow
  const cashflow = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return eachDayOfInterval({ start, end }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const day = (entries as any[]).filter((e: any) => e.date === key);
      const inc = day.filter((e: any) => e.type === "entrada").reduce((s: number, e: any) => s + Number(e.amount), 0);
      const exp = day.filter((e: any) => e.type === "saida").reduce((s: number, e: any) => s + Number(e.amount), 0);
      return { day: format(d, "dd/MM"), Receita: inc, Despesa: exp };
    });
  }, [entries]);
  const margin = totals.income > 0 ? ((totals.income - totals.exp) / totals.income) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        action={
          <Button onClick={() => setOpen(true)} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Plus className="w-4 h-4 mr-1" /> Novo lançamento
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard variant="cinematic" tone="emerald" label="Receitas" value={formatBRL(totals.income)} icon={TrendingUp} />
        <KpiCard variant="cinematic" tone="rose" label="Despesas" value={formatBRL(totals.exp)} icon={TrendingDown} />
        <KpiCard variant="cinematic" tone="brand" label="Saldo" value={formatBRL(totals.income - totals.exp)} icon={Wallet} hint="lucro do período" />
        <KpiCard variant="cinematic" tone="gold" label="Margem" value={`${margin.toFixed(1)}%`} icon={PiggyBank} hint="saúde do negócio" />
      </div>

      {/* Cinematic cashflow */}
      <Card className="relative overflow-hidden mb-6 border-border/60 shadow-[var(--shadow-soft)]">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(200 60% 40% / 0.25), transparent 70%)" }}
        />
        <CardHeader className="flex flex-row items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">Fluxo de caixa — últimos 30 dias</CardTitle>
            <p className="text-xs text-muted-foreground">Receita vs despesa diária</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={cashflow} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="appRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="appExp" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2} fill="url(#appRev)" />
                <Area type="monotone" dataKey="Despesa" stroke="#e85d3a" strokeWidth={2} fill="url(#appExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="receitas">
        <TabsList>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="pt-4">
          <DataTable data={entradas} searchableKeys={["description", "category"]}
            columns={[
              { key: "date", header: "Data", render: (r) => format(new Date(r.date), "dd/MM/yyyy") },
              { key: "category", header: "Categoria" },
              { key: "description", header: "Descrição" },
              { key: "amount", header: "Valor", render: (r) => <span className="text-emerald-600 font-medium">{formatBRL(r.amount)}</span> },
              {
                key: "actions", header: "", className: "text-right",
                render: (r) => (
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) remove.mutate(r.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="despesas" className="pt-4">
          <DataTable data={saidas} searchableKeys={["description", "category"]}
            columns={[
              { key: "date", header: "Data", render: (r) => format(new Date(r.date), "dd/MM/yyyy") },
              { key: "category", header: "Categoria" },
              { key: "description", header: "Descrição" },
              { key: "amount", header: "Valor", render: (r) => <span className="text-red-600 font-medium">{formatBRL(r.amount)}</span> },
              {
                key: "actions", header: "", className: "text-right",
                render: (r) => (
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) remove.mutate(r.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="comissoes" className="pt-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-50 to-white border border-amber-200/60 px-3 py-1 text-xs font-semibold text-amber-700">
            <Percent className="w-3.5 h-3.5" /> Total de comissões no mês: {formatBRL(totalCommission)}
          </div>
          <DataTable data={commissions} searchableKeys={["name"]}
            columns={[
              { key: "name", header: "Profissional" },
              { key: "count", header: "Atend. concluídos" },
              { key: "revenue", header: "Faturamento", render: (r) => formatBRL(r.revenue) },
              { key: "commission", header: "Comissão", render: (r) => <span className="font-semibold text-[var(--brand)]">{formatBRL(r.commission)}</span> },
            ]}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Cálculo baseado em comissão padrão por profissional. Para regras por serviço, use a aba Comissões em /app/profissionais.
          </p>
        </TabsContent>
      </Tabs>

      <FormDialog open={open} onOpenChange={setOpen} title="Novo lançamento"
        saving={save.isPending} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </FormDialog>
    </div>
  );
}
