import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Eye, Crown, Repeat, Sparkle, Gift } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

const TAG_ICON: Record<string, any> = { vip: Crown, recorrente: Repeat, novo: Sparkle };
const TAG_COLOR: Record<string, string> = {
  vip: "bg-amber-100 text-amber-800",
  recorrente: "bg-emerald-100 text-emerald-800",
  novo: "bg-sky-100 text-sky-800",
};

function ClientesPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", tags: "" });
  const [filter, setFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<any>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("customer").select("*").eq("company_id", cid!).order("name")).data ?? [],
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["customer-timeline", viewing?.id],
    enabled: !!viewing?.id,
    queryFn: async () =>
      (await supabase.from("appointment").select("*").eq("customer_id", viewing.id)
        .order("scheduled_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(
    () => filter === "all"
      ? customers
      : (customers as any[]).filter((c) => Array.isArray(c.tags) && c.tags.includes(filter)),
    [customers, filter],
  );

  const counts = useMemo(() => {
    const all = customers as any[];
    const c = (t: string) => all.filter((x) => Array.isArray(x.tags) && x.tags.includes(t)).length;
    return { all: all.length, vip: c("vip"), recorrente: c("recorrente"), novo: c("novo") };
  }, [customers]);

  const save = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("Sem empresa");
      const tags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const payload: any = { name: form.name, phone: form.phone, email: form.email || null, notes: form.notes || null, tags };
      if (editing) {
        const { error } = await supabase.from("customer").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer").insert({ ...payload, company_id: cid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", cid] });
      setOpen(false); setEditing(null);
      toast.success("Cliente salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Cadastro, tags e histórico"
        action={
          <Button
            onClick={() => { setEditing(null); setForm({ name: "", phone: "", email: "", notes: "", tags: "" }); setOpen(true); }}
            className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
          >
            <Plus className="w-4 h-4 mr-1" /> Novo cliente
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { v: "all", label: "Todos", c: counts.all },
          { v: "vip", label: "VIP", c: counts.vip },
          { v: "recorrente", label: "Recorrente", c: counts.recorrente },
          { v: "novo", label: "Novo", c: counts.novo },
        ].map((t) => (
          <Button
            key={t.v}
            size="sm"
            variant={filter === t.v ? "default" : "outline"}
            onClick={() => setFilter(t.v)}
            className={filter === t.v ? "bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" : ""}
          >
            {t.label} <span className="ml-2 text-xs opacity-70">{t.c}</span>
          </Button>
        ))}
      </div>

      <DataTable
        data={filtered as any[]}
        searchableKeys={["name", "phone", "email"]}
        columns={[
          { key: "name", header: "Nome" },
          { key: "phone", header: "Telefone" },
          {
            key: "tags", header: "Tags",
            render: (r) => (
              <div className="flex gap-1">
                {(r.tags ?? []).map((t: string) => {
                  const Icon = TAG_ICON[t];
                  return (
                    <Badge key={t} className={`${TAG_COLOR[t] ?? "bg-muted"} border-0 text-[10px]`}>
                      {Icon && <Icon className="w-3 h-3 mr-1" />}{t}
                    </Badge>
                  );
                })}
              </div>
            ),
          },
          { key: "total_appointments", header: "Atend." },
          {
            key: "fidelidade_contador", header: "Fidelidade",
            render: (r) => {
              if (!(company as any)?.fidelidade_ativa) return <span className="text-muted-foreground text-xs">—</span>;
              const meta = Number((company as any)?.fidelidade_meta ?? 10);
              const c = Number(r.fidelidade_contador ?? 0);
              const done = c >= meta;
              return (
                <Badge className={done ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}>
                  {done && <Gift className="w-3 h-3 mr-1" />}{c}/{meta}{done ? " 🎁" : ""}
                </Badge>
              );
            },
          },
          {
            key: "last_appointment_at", header: "Último",
            render: (r) => r.last_appointment_at ? format(parseISO(r.last_appointment_at), "dd/MM/yyyy") : "—",
          },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <div className="flex gap-1 justify-end">
                <Button size="icon" variant="ghost" onClick={() => setViewing(r)}><Eye className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(r);
                  setForm({
                    name: r.name, phone: r.phone, email: r.email ?? "", notes: r.notes ?? "",
                    tags: Array.isArray(r.tags) ? r.tags.join(", ") : "",
                  });
                  setOpen(true);
                }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) remove.mutate(r.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <FormDialog
        open={open} onOpenChange={setOpen}
        title={editing ? "Editar cliente" : "Novo cliente"}
        saving={save.isPending}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      >
        <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Telefone *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div>
          <Label>Tags (separadas por vírgula)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, recorrente, novo" />
        </div>
        <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </FormDialog>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewing?.name}</SheetTitle>
            <SheetDescription>{viewing?.phone} {viewing?.email && `• ${viewing.email}`}</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Atendimentos</p>
                  <p className="font-semibold">{viewing.total_appointments ?? 0}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Último</p>
                  <p className="font-semibold text-xs">
                    {viewing.last_appointment_at ? format(parseISO(viewing.last_appointment_at), "dd/MM/yy") : "—"}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold text-xs">{viewing.status ?? "—"}</p>
                </div>
              </div>
              {(company as any)?.fidelidade_ativa && (() => {
                const meta = Number((company as any).fidelidade_meta ?? 10);
                const c = Number(viewing.fidelidade_contador ?? 0);
                const pct = Math.min(100, Math.round((c / meta) * 100));
                const ready = c >= meta;
                return (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1"><Gift className="w-4 h-4" /> Fidelidade</span>
                      <span className="text-muted-foreground">{c}/{meta}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    {(company as any).fidelidade_premio && (
                      <p className="text-xs text-muted-foreground">Prêmio: {(company as any).fidelidade_premio}</p>
                    )}
                    {ready && (
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white w-full"
                        onClick={async () => {
                          if (!confirm("Resgatar prêmio e zerar o contador?")) return;
                          const { error } = await supabase.from("customer")
                            .update({ fidelidade_contador: 0 } as any).eq("id", viewing.id);
                          if (error) toast.error(error.message);
                          else { toast.success("Prêmio resgatado"); qc.invalidateQueries({ queryKey: ["customers", cid] }); setViewing({ ...viewing, fidelidade_contador: 0 }); }
                        }}>
                        <Gift className="w-4 h-4 mr-1" /> Resgatar prêmio
                      </Button>
                    )}
                  </div>
                );
              })()}
              <div>
                <h4 className="text-sm font-semibold mb-2">Histórico de atendimentos</h4>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {(timeline as any[]).length === 0 && <p className="text-sm text-muted-foreground">Sem registros.</p>}
                  {(timeline as any[]).map((a) => (
                    <div key={a.id} className="flex justify-between p-2 rounded border text-sm">
                      <div>
                        <div className="font-medium">{a.service_name}</div>
                        <div className="text-xs text-muted-foreground">{a.professional_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">{format(parseISO(a.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                        <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
