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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/produtos")({ component: ProdPage });

type Form = { nome: string; preco_reais: number; custo_reais: number; estoque: string; ativo: boolean };
const EMPTY: Form = { nome: "", preco_reais: 0, custo_reais: 0, estoque: "", ativo: true };

function ProdPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data = [] } = useQuery({
    queryKey: ["products", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("product").select("*").eq("company_id", cid!).order("nome")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("Sem empresa");
      const payload = {
        nome: form.nome.trim(),
        preco_cents: Math.round((form.preco_reais || 0) * 100),
        custo_cents: Math.round((form.custo_reais || 0) * 100),
        estoque: form.estoque.trim() === "" ? null : Math.max(0, parseInt(form.estoque) || 0),
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("product").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product").insert({ ...payload, company_id: cid });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", cid] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", cid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Venda no balcão e dentro das comandas"
        action={
          <Button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
            className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Plus className="w-4 h-4 mr-1" /> Novo produto
          </Button>
        }
      />
      <DataTable
        data={data as any[]}
        searchableKeys={["nome"]}
        columns={[
          { key: "nome", header: "Nome" },
          { key: "preco_cents", header: "Preço", render: (r) => formatBRL(r.preco_cents / 100) },
          { key: "custo_cents", header: "Custo", render: (r) => formatBRL(r.custo_cents / 100) },
          { key: "estoque", header: "Estoque", render: (r) => r.estoque == null ? "—" : String(r.estoque) },
          { key: "ativo", header: "Status", render: (r) => r.ativo ? "Ativo" : "Inativo" },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <div className="flex gap-1 justify-end">
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing(r);
                  setForm({
                    nome: r.nome,
                    preco_reais: r.preco_cents / 100,
                    custo_reais: r.custo_cents / 100,
                    estoque: r.estoque == null ? "" : String(r.estoque),
                    ativo: r.ativo,
                  });
                  setOpen(true);
                }}>
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
      <FormDialog open={open} onOpenChange={setOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        saving={save.isPending}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Preço (R$)</Label>
            <Input type="number" step="0.01" min={0} value={form.preco_reais}
              onChange={(e) => setForm({ ...form, preco_reais: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Custo (R$)</Label>
            <Input type="number" step="0.01" min={0} value={form.custo_reais}
              onChange={(e) => setForm({ ...form, custo_reais: parseFloat(e.target.value) || 0 })} /></div>
        </div>
        <div>
          <Label>Estoque (deixe vazio se não controla)</Label>
          <Input type="number" min={0} value={form.estoque}
            onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Ativo</Label>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>
      </FormDialog>
    </div>
  );
}
