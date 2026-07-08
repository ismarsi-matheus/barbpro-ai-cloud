import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profissionais")({ component: ProfPage });

function ProfPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", specialty: "", comissao_percentual: 50, active: true });
  const [commProf, setCommProf] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["professionals", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("professional").select("*").eq("company_id", cid!).order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("Sem empresa");
      const payload = {
        name: form.name, specialty: form.specialty, active: form.active,
        comissao_percentual: form.comissao_percentual,
        commission_type: "percent", commission_value: form.comissao_percentual,
      };
      if (editing) { const { error } = await supabase.from("professional").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("professional").insert({ ...payload, company_id: cid }); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professionals", cid] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("professional").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professionals", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Profissionais"
        action={<Button onClick={() => { setEditing(null); setForm({ name: "", specialty: "", comissao_percentual: 50, active: true }); setOpen(true); }}
          className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"><Plus className="w-4 h-4 mr-1" /> Novo profissional</Button>}
      />
      <DataTable data={data as any[]} searchableKeys={["name", "specialty"]}
        columns={[
          { key: "name", header: "Nome" },
          { key: "specialty", header: "Especialidade" },
          { key: "comissao_percentual", header: "Comissão", render: (r) => `${r.comissao_percentual ?? r.commission_value ?? 0}%` },
          { key: "active", header: "Status", render: (r) => r.active ? "Ativo" : "Inativo" },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="outline" onClick={() => setCommProf(r)}>
                  <Percent className="w-3.5 h-3.5 mr-1" /> Por serviço
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setForm({ name: r.name, specialty: r.specialty ?? "", comissao_percentual: Number(r.comissao_percentual ?? r.commission_value ?? 50), active: r.active }); setOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) remove.mutate(r.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]}
      />
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Editar profissional" : "Novo profissional"}
        saving={save.isPending} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Especialidade</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
        <div><Label>Comissão padrão (%)</Label><Input type="number" min={0} max={100} value={form.comissao_percentual} onChange={(e) => setForm({ ...form, comissao_percentual: parseFloat(e.target.value) || 0 })} /></div>
        <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div>
      </FormDialog>

      <Sheet open={!!commProf} onOpenChange={(o) => !o && setCommProf(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {commProf && cid && <CommissionsPanel cid={cid} professional={commProf} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CommissionsPanel({ cid, professional }: { cid: string; professional: any }) {
  const qc = useQueryClient();
  const { data: services = [] } = useQuery({
    queryKey: ["services", cid],
    queryFn: async () => (await supabase.from("service").select("*").eq("company_id", cid).order("name")).data ?? [],
  });
  const { data: links = [] } = useQuery({
    queryKey: ["professional_service", professional.id],
    queryFn: async () => (await supabase.from("professional_service").select("*").eq("professional_id", professional.id)).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async ({ service_id, commission_type, commission_value }: { service_id: string; commission_type: string; commission_value: number }) => {
      const existing = (links as any[]).find((l) => l.service_id === service_id);
      if (existing) {
        const { error } = await supabase.from("professional_service")
          .update({ commission_type, commission_value })
          .eq("professional_id", professional.id).eq("service_id", service_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_service")
          .insert({ professional_id: professional.id, service_id, commission_type, commission_value });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professional_service", professional.id] }); toast.success("Atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const detach = useMutation({
    mutationFn: async (service_id: string) => {
      const { error } = await supabase.from("professional_service")
        .delete().eq("professional_id", professional.id).eq("service_id", service_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professional_service", professional.id] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message),
  });

  const linkMap: Record<string, any> = {};
  (links as any[]).forEach((l) => { linkMap[l.service_id] = l; });

  return (
    <>
      <SheetHeader>
        <SheetTitle>Comissões — {professional.name}</SheetTitle>
        <SheetDescription>
          Defina percentual ou valor fixo por serviço. Sem regra: usa comissão padrão de {professional.commission_value ?? 0}%.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-2">
        {services.length === 0 && <p className="text-sm text-muted-foreground">Cadastre serviços primeiro.</p>}
        {(services as any[]).map((s) => {
          const link = linkMap[s.id];
          return <CommissionRow key={s.id} service={s} link={link}
            onSave={(t, v) => upsert.mutate({ service_id: s.id, commission_type: t, commission_value: v })}
            onClear={() => detach.mutate(s.id)} />;
        })}
      </div>
    </>
  );
}

function CommissionRow({ service, link, onSave, onClear }:
  { service: any; link: any; onSave: (t: string, v: number) => void; onClear: () => void }) {
  const [type, setType] = useState<string>(link?.commission_type ?? "percent");
  const [value, setValue] = useState<number>(Number(link?.commission_value ?? 0));
  const changed = !link || type !== link.commission_type || Number(value) !== Number(link.commission_value);

  return (
    <div className="flex items-center gap-2 p-3 border rounded-md">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{service.name}</p>
        <p className="text-xs text-muted-foreground">R$ {Number(service.price).toFixed(2)}</p>
      </div>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="percent">%</SelectItem>
          <SelectItem value="fixed">R$ fixo</SelectItem>
        </SelectContent>
      </Select>
      <Input type="number" className="w-24 h-9" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} />
      <Button size="sm" disabled={!changed} onClick={() => onSave(type, value)}
        className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">Salvar</Button>
      {link && <Button size="icon" variant="ghost" onClick={onClear}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
    </div>
  );
}
