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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/app/servicos")({ component: ServicosPage });

function ServicosPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  return (
    <div>
      <PageHeader title="Serviços" description="Itens e categorias do catálogo" />
      {!cid ? (
        <p className="text-sm text-muted-foreground">Carregando empresa…</p>
      ) : (
        <Tabs defaultValue="itens">
          <TabsList>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>
          <TabsContent value="itens"><ItensTab cid={cid} /></TabsContent>
          <TabsContent value="categorias"><CategoriasTab cid={cid} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ItensTab({ cid }: { cid: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", price: 0, duration_minutes: 30, description: "", active: true, category_id: null });

  const { data = [] } = useQuery({
    queryKey: ["services", cid],
    queryFn: async () => (await supabase.from("service").select("*").eq("company_id", cid).order("name")).data ?? [],
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["service_categories", cid],
    queryFn: async () => (await supabase.from("service_category").select("*").eq("company_id", cid).order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, category_id: form.category_id || null };
      if (editing) {
        const { error } = await supabase.from("service").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service").insert({ ...payload, company_id: cid });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services", cid] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("service").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const catName = (id: string | null) => cats.find((c: any) => c.id === id)?.name ?? "—";

  return (
    <div className="pt-4">
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditing(null); setForm({ name: "", price: 0, duration_minutes: 30, description: "", active: true, category_id: cats[0]?.id ?? null }); setOpen(true); }}
          className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Plus className="w-4 h-4 mr-1" /> Novo serviço
        </Button>
      </div>
      <DataTable
        data={data as any[]}
        searchableKeys={["name"]}
        columns={[
          { key: "name", header: "Nome" },
          { key: "category_id", header: "Categoria", render: (r) => catName(r.category_id) },
          { key: "price", header: "Preço", render: (r) => formatBRL(r.price) },
          { key: "duration_minutes", header: "Duração", render: (r) => `${r.duration_minutes} min` },
          { key: "active", header: "Status", render: (r) => r.active ? "Ativo" : "Inativo" },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <div className="flex gap-1 justify-end">
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(r);
                  setForm({ name: r.name, price: Number(r.price), duration_minutes: r.duration_minutes, description: r.description ?? "", active: r.active, category_id: r.category_id ?? null });
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
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Editar serviço" : "Novo serviço"}
        saving={save.isPending} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <Label>Categoria</Label>
          <Select value={form.category_id ?? "_none"} onValueChange={(v) => setForm({ ...form, category_id: v === "_none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem categoria</SelectItem>
              {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} /></div>
        </div>
        <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="flex items-center justify-between">
          <Label>Ativo</Label>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </FormDialog>
    </div>
  );
}

function CategoriasTab({ cid }: { cid: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", active: true });

  const { data: cats = [] } = useQuery({
    queryKey: ["service_categories", cid],
    queryFn: async () => (await supabase.from("service_category").select("*").eq("company_id", cid).order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("service_category").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextOrder = (cats as any[]).reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0) + 1;
        const { error } = await supabase.from("service_category").insert({ ...form, company_id: cid, sort_order: nextOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_categories", cid] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("service_category").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_categories", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (ordered: any[]) => {
      await Promise.all(ordered.map((c, i) =>
        supabase.from("service_category").update({ sort_order: i + 1 }).eq("id", c.id)
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service_categories", cid] }),
    onError: (e: any) => toast.error(e.message),
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cats.findIndex((c: any) => c.id === active.id);
    const newIndex = cats.findIndex((c: any) => c.id === over.id);
    const next = arrayMove(cats as any[], oldIndex, newIndex);
    qc.setQueryData(["service_categories", cid], next);
    reorder.mutate(next);
  }

  return (
    <div className="pt-4">
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditing(null); setForm({ name: "", active: true }); setOpen(true); }}
          className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Plus className="w-4 h-4 mr-1" /> Nova categoria
        </Button>
      </div>
      <div className="rounded-md border bg-card">
        {cats.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma categoria. Crie uma para organizar seus serviços.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(cats as any[]).map(c => c.id)} strategy={verticalListSortingStrategy}>
              {(cats as any[]).map((cat) => (
                <SortableCatRow key={cat.id} cat={cat}
                  onEdit={() => { setEditing(cat); setForm({ name: cat.name, active: cat.active }); setOpen(true); }}
                  onRemove={() => { if (confirm("Remover categoria?")) remove.mutate(cat.id); }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Arraste pelo ícone para reordenar.</p>

      <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Editar categoria" : "Nova categoria"}
        saving={save.isPending} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div>
      </FormDialog>
    </div>
  );
}

function SortableCatRow({ cat, onEdit, onRemove }: { cat: any; onEdit: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-xs text-muted-foreground w-6">#{cat.sort_order}</span>
      <span className="flex-1 font-medium">{cat.name}</span>
      {!cat.active && <span className="text-xs text-muted-foreground">inativa</span>}
      <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="w-4 h-4 text-destructive" /></Button>
    </div>
  );
}
