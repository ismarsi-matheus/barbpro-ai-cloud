import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { Plus, Pencil, Trash2, Copy, Lock, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { featureEnabled, normalizePlanSlug } from "@/lib/plan-features";

export const Route = createFileRoute("/app/clube")({ component: ClubePage });

function ClubePage() {
  const { data: company } = useCurrentCompany();
  const planSlug = normalizePlanSlug((company as any)?.selected_plan_slug ?? (company as any)?.plano);
  const allowed = featureEnabled(planSlug, "clubeAssinatura");
  const cid = company?.id;

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Clube de Assinatura" description="Receita recorrente para a barbearia" />
        <Card><CardContent className="p-8 text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">Disponível no plano Business</p>
          <p className="text-sm text-muted-foreground">Crie planos mensais (ex.: 4 cortes/mês) e fidelize seu cliente com cobrança recorrente.</p>
          <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <a href="/app/checkout">Fazer upgrade</a>
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Clube de Assinatura" description="Receita recorrente da barbearia" />
      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos do clube</TabsTrigger>
          <TabsTrigger value="assinantes">Assinantes</TabsTrigger>
        </TabsList>
        <TabsContent value="planos" className="pt-4">{cid && <PlanosTab cid={cid} />}</TabsContent>
        <TabsContent value="assinantes" className="pt-4">{cid && <AssinantesTab cid={cid} />}</TabsContent>
      </Tabs>
    </div>
  );
}

function PlanosTab({ cid }: { cid: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", preco_reais: 0, beneficios: "", ativo: true, checkout_url: "" });

  const { data = [] } = useQuery({
    queryKey: ["club-plans", cid],
    queryFn: async () => (await supabase.from("club_plan").select("*").eq("company_id", cid).order("created_at")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const beneficios = form.beneficios.split("\n").map((s) => s.trim()).filter(Boolean);
      const payload = {
        nome: form.nome.trim(),
        preco_cents: Math.round((form.preco_reais || 0) * 100),
        beneficios,
        ativo: form.ativo,
        checkout_url: form.checkout_url.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("club_plan").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("club_plan").insert({ ...payload, company_id: cid });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["club-plans", cid] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("club_plan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["club-plans", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => { setEditing(null); setForm({ nome: "", preco_reais: 0, beneficios: "", ativo: true, checkout_url: "" }); setOpen(true); }}
          className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Plus className="w-4 h-4 mr-1" /> Novo plano
        </Button>
      </div>

      {(data as any[]).length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {(data as any[]).map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{p.nome}</CardTitle>
              <Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">{formatBRL(p.preco_cents / 100)}<span className="text-xs text-muted-foreground"> /mês</span></p>
              {Array.isArray(p.beneficios) && p.beneficios.length > 0 && (
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {p.beneficios.map((b: string, i: number) => <li key={i}>• {b}</li>)}
                </ul>
              )}
              <div className="flex gap-2 pt-2">
                {p.checkout_url && (
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(p.checkout_url);
                    toast.success("Link copiado");
                  }}><Copy className="w-3.5 h-3.5 mr-1" /> Copiar link</Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(p);
                  setForm({
                    nome: p.nome, preco_reais: p.preco_cents / 100,
                    beneficios: Array.isArray(p.beneficios) ? p.beneficios.join("\n") : "",
                    ativo: p.ativo, checkout_url: p.checkout_url ?? "",
                  });
                  setOpen(true);
                }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) remove.mutate(p.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormDialog open={open} onOpenChange={setOpen}
        title={editing ? "Editar plano" : "Novo plano"}
        saving={save.isPending}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><Label>Preço (R$/mês)</Label>
          <Input type="number" step="0.01" min={0} value={form.preco_reais}
            onChange={(e) => setForm({ ...form, preco_reais: parseFloat(e.target.value) || 0 })} /></div>
        <div><Label>Benefícios (1 por linha)</Label>
          <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px]"
            value={form.beneficios} onChange={(e) => setForm({ ...form, beneficios: e.target.value })}
            placeholder="4 cortes inclusos&#10;Barba grátis&#10;10% off em produtos" />
        </div>
        <div><Label>Link de checkout (opcional)</Label>
          <Input value={form.checkout_url} placeholder="https://…"
            onChange={(e) => setForm({ ...form, checkout_url: e.target.value })} /></div>
        <div className="flex items-center justify-between">
          <Label>Ativo</Label>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>
      </FormDialog>
    </div>
  );
}

function AssinantesTab({ cid }: { cid: string }) {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["club-members", cid],
    queryFn: async () =>
      (await supabase.from("club_member")
        .select("*, customer:customer_id(name, phone), club_plan:club_plan_id(nome, preco_cents)")
        .eq("company_id", cid).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["club-plans-list", cid],
    queryFn: async () => (await supabase.from("club_plan").select("id, nome, preco_cents").eq("company_id", cid).eq("ativo", true)).data ?? [],
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list-club", cid],
    queryFn: async () => (await supabase.from("customer").select("id, name").eq("company_id", cid).order("name").limit(500)).data ?? [],
  });

  const mrr = useMemo(
    () => (members as any[]).filter((m) => m.status === "ativo")
      .reduce((s, m) => s + (m.club_plan?.preco_cents ?? 0), 0) / 100,
    [members],
  );
  const activeCount = (members as any[]).filter((m) => m.status === "ativo").length;

  const create = useMutation({
    mutationFn: async () => {
      if (!customerId || !planId) throw new Error("Escolha cliente e plano");
      const { error } = await supabase.from("club_member").insert({
        company_id: cid, customer_id: customerId, club_plan_id: planId,
        status: "ativo", started_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["club-members", cid] }); setNewOpen(false); setCustomerId(""); setPlanId(""); toast.success("Assinante cadastrado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("club_member").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-members", cid] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Receita recorrente (MRR)</p>
          <p className="text-2xl font-bold">{formatBRL(mrr)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Assinantes ativos</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setNewOpen(true)} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Plus className="w-4 h-4 mr-1" /> Novo assinante
        </Button>
      </div>

      <div className="space-y-1.5">
        {(members as any[]).length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sem assinantes ainda.</CardContent></Card>
        )}
        {(members as any[]).map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{m.customer?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{m.club_plan?.nome} • {formatBRL((m.club_plan?.preco_cents ?? 0) / 100)} /mês</p>
              </div>
              <Badge className={m.status === "ativo" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}>{m.status}</Badge>
              {m.status === "ativo" ? (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: m.id, status: "cancelado" })}>Cancelar</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: m.id, status: "ativo" })}>Reativar</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo assinante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>
                  {(customers as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plano</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>
                  {(plans as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {formatBRL(p.preco_cents / 100)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}
              className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
