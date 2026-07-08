import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/master/assinaturas")({ component: AssinaturasPage });

type Row = {
  id: string;
  company_id: string;
  plan_id: string | null;
  status: string;
  provider: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  updated_at: string;
  company: { name: string | null; nome_fantasia: string | null } | null;
  plan: { nome: string | null; preco_cents: number | null } | null;
};

const STATUS_STYLE: Record<string, string> = {
  trialing: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  past_due: "bg-amber-100 text-amber-900 border-amber-200",
  canceled: "bg-gray-200 text-gray-700 border-gray-300",
  paused: "bg-purple-100 text-purple-800 border-purple-200",
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AssinaturasPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data = [] } = useQuery({
    queryKey: ["master-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription" as any)
        .select("*, company:company_id(name, nome_fantasia), plan:plan_id(nome, preco_cents)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 10000,
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? data : data.filter((r) => r.status === statusFilter)),
    [data, statusFilter],
  );

  const stats = useMemo(() => {
    const ativas = data.filter((r) => r.status === "active");
    const trial = data.filter((r) => r.status === "trialing").length;
    const pastDue = data.filter((r) => r.status === "past_due").length;
    const mrr = ativas.reduce((sum, r) => sum + (r.plan?.preco_cents ?? 0), 0);
    return { mrr, ativas: ativas.length, trial, pastDue };
  }, [data]);

  const markPaid = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from("subscription" as any).update({
        status: "active",
        provider: "manual",
      }).eq("id", r.id);
      if (error) throw error;
      const { error: cErr } = await supabase.from("company").update({
        status_cobranca: "ativo",
      }).eq("id", r.company_id);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-subscriptions"] });
      toast.success("Assinatura marcada como paga");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Assinaturas" description="Todas as assinaturas das barbearias" />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={brl(stats.mrr)} />
        <StatCard label="Ativas" value={String(stats.ativas)} />
        <StatCard label="Em trial" value={String(stats.trial)} />
        <StatCard label="Inadimplentes" value={String(stats.pastDue)} tone="warn" />
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="past_due">Inadimplentes</SelectItem>
            <SelectItem value="canceled">Canceladas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">Atualiza a cada 10s</span>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Período atual</TableHead>
              <TableHead>Trial até</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.company?.nome_fantasia || r.company?.name || "—"}</TableCell>
                <TableCell>{r.plan?.nome ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{r.provider}</TableCell>
                <TableCell className="text-xs">
                  {r.current_period_end ? format(parseISO(r.current_period_end), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {r.trial_ends_at ? format(parseISO(r.trial_ends_at), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell className="text-xs">{format(parseISO(r.updated_at), "dd/MM HH:mm")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={r.status === "active" || markPaid.isPending}
                    onClick={() => markPaid.mutate(r)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar como paga
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${tone === "warn" ? "text-amber-700" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
