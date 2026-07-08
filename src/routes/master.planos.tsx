import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, AlertTriangle, Power } from "lucide-react";

export const Route = createFileRoute("/master/planos")({ component: PlanosPage });

type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_cents: number;
  moeda: string;
  intervalo: string;
  trial_days: number;
  limite_profissionais: number;
  limite_usuarios: number;
  limite_clientes: number;
  limite_agendamentos_mes: number;
  features: string[];
  destaque: boolean | null;
  ativo: boolean | null;
  ordem: number | null;
  checkout_url: string | null;
};

type FormState = {
  id?: string;
  nome: string;
  slug: string;
  descricao: string;
  preco_reais: string;
  intervalo: string;
  trial_days: number;
  limite_profissionais: number;
  limite_usuarios: number;
  limite_clientes: number;
  limite_agendamentos_mes: number;
  features_text: string;
  checkout_url: string;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
};

const empty: FormState = {
  nome: "", slug: "", descricao: "", preco_reais: "0", intervalo: "month",
  trial_days: 14, limite_profissionais: 3, limite_usuarios: 3,
  limite_clientes: 1000, limite_agendamentos_mes: 1000,
  features_text: "", checkout_url: "", destaque: false, ativo: true, ordem: 0,
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlanosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["master-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan" as any)
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Plan[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (s: FormState) => {
      const features = s.features_text
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      const preco_cents = Math.round(parseFloat(s.preco_reais.replace(",", ".") || "0") * 100);
      const payload = {
        nome: s.nome,
        slug: s.slug,
        descricao: s.descricao || null,
        preco_cents,
        intervalo: s.intervalo,
        trial_days: s.trial_days,
        limite_profissionais: s.limite_profissionais,
        limite_usuarios: s.limite_usuarios,
        limite_clientes: s.limite_clientes,
        limite_agendamentos_mes: s.limite_agendamentos_mes,
        features,
        checkout_url: s.checkout_url || null,
        destaque: s.destaque,
        ativo: s.ativo,
        ordem: s.ordem,
      };
      if (s.id) {
        const { error } = await supabase.from("plan" as any).update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plan" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-plans"] });
      setOpen(false);
      setForm(empty);
      toast.success("Plano salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar plano"),
  });

  const toggleAtivo = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from("plan" as any).update({ ativo: !p.ativo }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-plans"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-plans"] }); toast.success("Plano removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (p: Plan) => {
    setForm({
      id: p.id,
      nome: p.nome,
      slug: p.slug,
      descricao: p.descricao ?? "",
      preco_reais: (p.preco_cents / 100).toFixed(2),
      intervalo: p.intervalo,
      trial_days: p.trial_days,
      limite_profissionais: p.limite_profissionais,
      limite_usuarios: p.limite_usuarios,
      limite_clientes: p.limite_clientes,
      limite_agendamentos_mes: p.limite_agendamentos_mes,
      features_text: (p.features ?? []).join("\n"),
      checkout_url: p.checkout_url ?? "",
      destaque: !!p.destaque,
      ativo: !!p.ativo,
      ordem: p.ordem ?? 0,
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Planos comerciais oferecidos para as barbearias"
        action={
          <Button onClick={openNew} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Plus className="w-4 h-4 mr-2" /> Novo plano
          </Button>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((p) => {
          const missingCheckout = !!p.ativo && !p.checkout_url;
          return (
            <Card key={p.id} className={`relative ${p.destaque ? "ring-2 ring-amber-400" : ""} ${!p.ativo ? "opacity-60" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.nome}
                      {p.destaque && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">/{p.slug}</p>
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-2xl font-semibold">{brl(p.preco_cents)}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {p.intervalo === "year" ? "ano" : "mês"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Trial {p.trial_days}d · {p.limite_profissionais} prof · {p.limite_usuarios} users ·
                  {" "}{p.limite_clientes} clientes · {p.limite_agendamentos_mes} agend/mês
                </p>
                {p.features && p.features.length > 0 && (
                  <ul className="text-xs space-y-1 text-foreground/80">
                    {p.features.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                )}
                {missingCheckout && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Sem URL de checkout — clientes não conseguem assinar.</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5 mr-1" />Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAtivo.mutate(p)}>
                    <Power className="w-3.5 h-3.5 mr-1" />{p.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>Configure os limites e a URL de checkout do provedor.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              </div>
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input value={form.preco_reais} onChange={(e) => setForm({ ...form, preco_reais: e.target.value })} />
            </div>
            <div>
              <Label>Intervalo</Label>
              <Select value={form.intervalo} onValueChange={(v) => setForm({ ...form, intervalo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trial (dias)</Label>
              <Input type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: +e.target.value })} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: +e.target.value })} />
            </div>
            <div>
              <Label>Limite profissionais</Label>
              <Input type="number" value={form.limite_profissionais} onChange={(e) => setForm({ ...form, limite_profissionais: +e.target.value })} />
            </div>
            <div>
              <Label>Limite usuários</Label>
              <Input type="number" value={form.limite_usuarios} onChange={(e) => setForm({ ...form, limite_usuarios: +e.target.value })} />
            </div>
            <div>
              <Label>Limite clientes</Label>
              <Input type="number" value={form.limite_clientes} onChange={(e) => setForm({ ...form, limite_clientes: +e.target.value })} />
            </div>
            <div>
              <Label>Limite agendamentos/mês</Label>
              <Input type="number" value={form.limite_agendamentos_mes} onChange={(e) => setForm({ ...form, limite_agendamentos_mes: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Features (1 por linha)</Label>
              <Textarea rows={4} value={form.features_text} onChange={(e) => setForm({ ...form, features_text: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>URL de checkout (Kiwify / Cakto / Perfectpay / Hotmart / Kirvano)</Label>
              <Input value={form.checkout_url} onChange={(e) => setForm({ ...form, checkout_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} />
              <Label>Destaque</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => upsert.mutate(form)}
              disabled={upsert.isPending || !form.nome || !form.slug}
              className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
            >
              {upsert.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove o plano "{deleteTarget?.nome}". Assinaturas vinculadas ficarão sem plano de referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteTarget) remove.mutate(deleteTarget.id); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
