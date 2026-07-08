import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Receipt, CheckCircle2, X, Scissors, Package } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

const searchSchema = z.object({
  appointment_id: z.string().uuid().optional(),
  open: z.string().uuid().optional(),
});

export const Route = createFileRoute("/app/comandas")({
  validateSearch: searchSchema,
  component: ComandasPage,
});

const FORMAS = [
  { v: "pix", l: "Pix" }, { v: "dinheiro", l: "Dinheiro" },
  { v: "cartao_credito", l: "Cartão Crédito" }, { v: "cartao_debito", l: "Cartão Débito" },
  { v: "outro", l: "Outro" },
];
const STATUS_LABEL: Record<string, { l: string; cls: string }> = {
  aberta: { l: "Aberta", cls: "bg-amber-100 text-amber-800" },
  fechada: { l: "Fechada", cls: "bg-emerald-100 text-emerald-800" },
  cancelada: { l: "Cancelada", cls: "bg-slate-200 text-slate-700" },
};

function ComandasPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();
  const search = Route.useSearch();
  const nav = Route.useNavigate();

  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openSale, setOpenSale] = useState<string | null>(null);
  const [newDialog, setNewDialog] = useState(false);

  // sync com query string (?open=)
  useEffect(() => { if (search.open) setOpenSale(search.open); }, [search.open]);
  // se veio com appointment_id, abre o diálogo "nova comanda"
  useEffect(() => { if (search.appointment_id) setNewDialog(true); }, [search.appointment_id]);

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", cid, dateFilter, statusFilter],
    enabled: !!cid,
    queryFn: async () => {
      let q = supabase.from("sale").select("*, professional:professional_id(name), customer:customer_id(name)")
        .eq("company_id", cid!)
        .gte("created_at", startOfDay(parseISO(dateFilter)).toISOString())
        .lt("created_at", endOfDay(parseISO(dateFilter)).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      return (await q).data ?? [];
    },
  });

  const totalDia = useMemo(
    () => (sales as any[]).filter((s) => s.status === "fechada").reduce((sum, s) => sum + (s.total_cents ?? 0), 0),
    [sales],
  );
  const abertas = (sales as any[]).filter((s) => s.status === "aberta").length;
  const fechadas = (sales as any[]).filter((s) => s.status === "fechada").length;
  const ticketMedio = fechadas > 0 ? totalDia / fechadas : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comandas"
        description="Atendimentos do dia — abra, adicione serviços/produtos e feche."
        action={
          <Button onClick={() => setNewDialog(true)} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Plus className="w-4 h-4 mr-1" /> Nova comanda
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Faturamento do dia</p>
          <p className="text-xl font-bold mt-1">{formatBRL(totalDia / 100)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Comandas fechadas</p>
          <p className="text-xl font-bold mt-1">{fechadas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="text-xl font-bold mt-1">{abertas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ticket médio</p>
          <p className="text-xl font-bold mt-1">{formatBRL(ticketMedio / 100)}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="fechada">Fechada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {(sales as any[]).length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
            Sem comandas neste dia.
          </CardContent></Card>
        )}
        {(sales as any[]).map((s) => {
          const st = STATUS_LABEL[s.status] ?? { l: s.status, cls: "" };
          return (
            <Card key={s.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setOpenSale(s.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Receipt className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.customer?.name ?? "Cliente avulso"}</span>
                    <Badge className={st.cls}>{st.l}</Badge>
                    {s.forma_pagamento && <Badge variant="outline">{FORMAS.find((f) => f.v === s.forma_pagamento)?.l ?? s.forma_pagamento}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(s.created_at), "HH:mm", { locale: ptBR })}
                    {s.professional?.name && ` • ${s.professional.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatBRL((s.total_cents ?? 0) / 100)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sheet de gerenciamento da comanda */}
      <Sheet open={!!openSale} onOpenChange={(o) => {
        if (!o) { setOpenSale(null); nav({ search: {}, replace: true }); }
      }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {openSale && cid && <SaleManager saleId={openSale} cid={cid} onClose={() => { setOpenSale(null); qc.invalidateQueries({ queryKey: ["sales"] }); }} />}
        </SheetContent>
      </Sheet>

      {/* Dialog: nova comanda */}
      <NewSaleDialog
        open={newDialog}
        cid={cid}
        appointmentId={search.appointment_id}
        onOpenChange={(o) => { if (!o) { setNewDialog(false); nav({ search: {}, replace: true }); } }}
        onCreated={(id) => {
          setNewDialog(false);
          qc.invalidateQueries({ queryKey: ["sales"] });
          setOpenSale(id);
        }}
      />
    </div>
  );
}

// ============= Sheet: gerenciar uma comanda =============
function SaleManager({ saleId, cid, onClose }: { saleId: string; cid: string; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: sale } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: async () => (await supabase.from("sale").select("*").eq("id", saleId).single()).data,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["sale-items", saleId],
    queryFn: async () => (await supabase.from("sale_item").select("*").eq("sale_id", saleId).order("created_at")).data ?? [],
  });
  const { data: services = [] } = useQuery({
    queryKey: ["svc-list", cid],
    queryFn: async () => (await supabase.from("service").select("id, name, price").eq("company_id", cid).eq("active", true).order("name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["prod-list", cid],
    queryFn: async () => (await supabase.from("product").select("id, nome, preco_cents, estoque").eq("company_id", cid).eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: pros = [] } = useQuery({
    queryKey: ["pros-list-c", cid],
    queryFn: async () => (await supabase.from("professional").select("id, name").eq("company_id", cid).eq("active", true).order("name")).data ?? [],
  });

  const [tipo, setTipo] = useState<"servico" | "produto">("servico");
  const [refId, setRefId] = useState<string>("");
  const [profId, setProfId] = useState<string>("");
  const [desconto, setDesconto] = useState<number>(0);
  const [forma, setForma] = useState<string>("");

  useEffect(() => {
    if (sale) {
      setDesconto((sale.desconto_cents ?? 0) / 100);
      setForma(sale.forma_pagamento ?? "");
      setProfId(sale.professional_id ?? "");
    }
  }, [sale]);

  const subtotal = (items as any[]).reduce((s, i) => s + i.preco_cents * i.quantidade, 0);
  const total = Math.max(0, subtotal - Math.round((desconto || 0) * 100));
  const readOnly = sale?.status !== "aberta";

  const addItem = useMutation({
    mutationFn: async () => {
      if (!refId) throw new Error("Escolha um item");
      if (tipo === "servico") {
        const svc = (services as any[]).find((x) => x.id === refId);
        if (!svc) throw new Error("Serviço inválido");
        const { error } = await supabase.from("sale_item").insert({
          sale_id: saleId, company_id: cid, tipo: "servico", ref_id: svc.id,
          descricao: svc.name, preco_cents: Math.round(Number(svc.price) * 100),
          quantidade: 1, professional_id: profId || sale?.professional_id || null,
        } as any);
        if (error) throw error;
      } else {
        const prod = (products as any[]).find((x) => x.id === refId);
        if (!prod) throw new Error("Produto inválido");
        const { error } = await supabase.from("sale_item").insert({
          sale_id: saleId, company_id: cid, tipo: "produto", ref_id: prod.id,
          descricao: prod.nome, preco_cents: prod.preco_cents, quantidade: 1,
          professional_id: profId || sale?.professional_id || null,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sale-items", saleId] }); setRefId(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("sale_item").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale-items", saleId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sale_item").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale-items", saleId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const cancelSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sale").update({ status: "cancelada" }).eq("id", saleId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Comanda cancelada"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeSale = useMutation({
    mutationFn: async () => {
      if (!forma) throw new Error("Escolha a forma de pagamento");
      const { error } = await supabase.rpc("close_sale", {
        _sale_id: saleId,
        _forma_pagamento: forma,
        _desconto_cents: Math.round((desconto || 0) * 100),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Comanda fechada e receita registrada"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <SheetHeader>
        <SheetTitle>Comanda #{saleId.slice(0, 8)}</SheetTitle>
        <SheetDescription>
          {sale && format(parseISO(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {sale && <Badge className={`ml-2 ${STATUS_LABEL[sale.status]?.cls ?? ""}`}>{STATUS_LABEL[sale.status]?.l}</Badge>}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-3">
        {!readOnly && (
          <Card><CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <Select value={tipo} onValueChange={(v: any) => { setTipo(v); setRefId(""); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={refId} onValueChange={setRefId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={tipo === "servico" ? "Escolher serviço…" : "Escolher produto…"} /></SelectTrigger>
                <SelectContent>
                  {tipo === "servico"
                    ? (services as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {formatBRL(Number(s.price))}</SelectItem>)
                    : (products as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {formatBRL(p.preco_cents / 100)}{p.estoque != null ? ` (${p.estoque} em estoque)` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => addItem.mutate()} disabled={!refId || addItem.isPending}
                className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-xs">Profissional padrão dos itens</Label>
              <Select value={profId} onValueChange={setProfId}>
                <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {(pros as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent></Card>
        )}

        <div className="space-y-1">
          {(items as any[]).length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">Sem itens ainda.</p>
          )}
          {(items as any[]).map((it) => (
            <Card key={it.id}><CardContent className="p-3 flex items-center gap-2">
              {it.tipo === "servico" ? <Scissors className="w-4 h-4 text-muted-foreground" /> : <Package className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(it.preco_cents / 100)} × {it.quantidade} = {formatBRL((it.preco_cents * it.quantidade) / 100)}
                </p>
              </div>
              {!readOnly && (
                <>
                  <Input type="number" min={1} className="w-16 h-8" value={it.quantidade}
                    onChange={(e) => updateItem.mutate({ id: it.id, patch: { quantidade: Math.max(1, parseInt(e.target.value) || 1) } })} />
                  <Select value={it.professional_id ?? ""} onValueChange={(v) => updateItem.mutate({ id: it.id, patch: { professional_id: v || null } })}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Profissional" /></SelectTrigger>
                    <SelectContent>
                      {(pros as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => removeItem.mutate(it.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </CardContent></Card>
          ))}
        </div>

        <Card><CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={forma} onValueChange={setForma} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Desconto (R$)</Label>
              <Input type="number" step="0.01" min={0} value={desconto} disabled={readOnly}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span><span>{formatBRL(subtotal / 100)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Desconto</span><span>− {formatBRL(desconto || 0)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total</span><span>{formatBRL(total / 100)}</span>
          </div>
        </CardContent></Card>

        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { if (confirm("Cancelar comanda?")) cancelSale.mutate(); }}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={closeSale.isPending || (items as any[]).length === 0}
              onClick={() => closeSale.mutate()}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Fechar comanda
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ============= Diálogo: nova comanda =============
function NewSaleDialog({
  open, cid, appointmentId, onOpenChange, onCreated,
}: {
  open: boolean; cid: string | undefined; appointmentId?: string;
  onOpenChange: (o: boolean) => void; onCreated: (id: string) => void;
}) {
  const [customerId, setCustomerId] = useState<string>("");
  const [profId, setProfId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["cust-list", cid],
    enabled: !!cid && open,
    queryFn: async () => (await supabase.from("customer").select("id, name").eq("company_id", cid!).order("name").limit(200)).data ?? [],
  });
  const { data: pros = [] } = useQuery({
    queryKey: ["pros-list-n", cid],
    enabled: !!cid && open,
    queryFn: async () => (await supabase.from("professional").select("id, name").eq("company_id", cid!).eq("active", true).order("name")).data ?? [],
  });

  // Se veio com appointment_id, carrega
  const { data: apt } = useQuery({
    queryKey: ["apt", appointmentId],
    enabled: !!appointmentId && open,
    queryFn: async () => (await supabase.from("appointment").select("*").eq("id", appointmentId!).maybeSingle()).data,
  });
  useEffect(() => {
    if (apt) {
      setCustomerId(apt.customer_id ?? "");
      setProfId(apt.professional_id ?? "");
    }
  }, [apt]);

  const create = async () => {
    if (!cid) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("sale").insert({
        company_id: cid,
        appointment_id: appointmentId ?? null,
        customer_id: customerId || null,
        professional_id: profId || null,
        created_by: user?.id ?? null,
      } as any).select("id").single();
      if (error) throw error;

      // Se veio de um agendamento, pré-popula o item do serviço
      if (apt && apt.service_id) {
        const { data: svc } = await supabase.from("service").select("id, name, price").eq("id", apt.service_id).maybeSingle();
        if (svc) {
          await supabase.from("sale_item").insert({
            sale_id: data.id, company_id: cid, tipo: "servico", ref_id: svc.id,
            descricao: svc.name, preco_cents: Math.round(Number(svc.price ?? apt.price ?? 0) * 100),
            quantidade: 1, professional_id: profId || apt.professional_id || null,
          } as any);
        }
      }
      onCreated(data.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Avulso (sem cadastro)" /></SelectTrigger>
              <SelectContent>
                {(customers as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profissional</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
              <SelectContent>
                {(pros as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {appointmentId && apt && (
            <p className="text-xs text-muted-foreground">
              Vindo do agendamento de <b>{apt.customer_name ?? "cliente"}</b> — <b>{apt.service_name}</b> com <b>{apt.professional_name}</b>.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={create} disabled={saving} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            {saving ? "Abrindo…" : "Abrir comanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
