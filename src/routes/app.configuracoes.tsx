import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { BookingLinkCard } from "@/components/booking-link-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";
import { ExternalLink, Users } from "lucide-react";

export const Route = createFileRoute("/app/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const { data: company } = useCurrentCompany();
  return (
    <div>
      <PageHeader title="Configurações" />
      <BookingLinkCard className="mb-6" />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="fidelidade">Fidelidade</TabsTrigger>
          <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
        <TabsContent value="equipe"><EquipeTab cid={company?.id} /></TabsContent>
        <TabsContent value="aparencia"><AparenciaTab /></TabsContent>
        <TabsContent value="fidelidade"><FidelidadeTab /></TabsContent>
        <TabsContent value="cobranca"><CobrancaTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EmpresaTab() {
  const { data: company } = useCurrentCompany();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", nome_fantasia: "", telefone_comercial: "", whatsapp: "", slug: "", email_contato: "" });

  useEffect(() => {
    if (company) setForm({
      name: company.name ?? "", nome_fantasia: company.nome_fantasia ?? "",
      telefone_comercial: company.telefone_comercial ?? "", whatsapp: company.whatsapp ?? "",
      slug: company.slug ?? "", email_contato: (company as any).email_contato ?? "",
    });
  }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Sem empresa");
      const { error } = await supabase.from("company").update(form).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["current-company"] }); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="mt-4"><CardContent className="p-6 space-y-3 max-w-2xl">
      <div><Label>Razão social</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Nome fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Email contato</Label><Input type="email" value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} /></div>
        <div><Label>Telefone</Label><Input value={form.telefone_comercial} onChange={(e) => setForm({ ...form, telefone_comercial: e.target.value })} /></div>
      </div>
      <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
      <div>
        <Label>Slug público</Label>
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        {form.slug && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <Link to="/agendar/$slug" params={{ slug: form.slug }} className="text-[var(--brand)] hover:underline">
              /agendar/{form.slug}
            </Link>
          </p>
        )}
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}
        className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">Salvar</Button>
    </CardContent></Card>
  );
}

function EquipeTab({ cid }: { cid?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["team-config", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("company_user").select("*").eq("company_id", cid!).order("created_at")).data ?? [],
  });
  return (
    <Card className="mt-4"><CardContent className="p-6 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold">Equipe</p>
          <p className="text-xs text-muted-foreground">Gerencie convites e papéis em /app/Equipe</p>
        </div>
        <Link to="/app/equipe">
          <Button variant="outline" size="sm"><Users className="w-3.5 h-3.5 mr-1" /> Abrir Equipe</Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead><TableHead>Email</TableHead>
            <TableHead>Papel</TableHead><TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data as any[]).length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground text-center">Sem membros cadastrados.</TableCell></TableRow>
          )}
          {(data as any[]).map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.nome || "—"}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
              <TableCell>
                {u.convite_aceito || u.user_id
                  ? <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
                  : <Badge variant="secondary">Pendente</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function AparenciaTab() {
  const { data: company } = useCurrentCompany();
  const qc = useQueryClient();
  const [color, setColor] = useState("#1B3A4B");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    if (company) { setColor(company.primary_color ?? "#1B3A4B"); setLogo(company.logo_url ?? ""); }
  }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Sem empresa");
      const { error } = await supabase.from("company").update({ primary_color: color, logo_url: logo || null }).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["current-company"] }); toast.success("Aparência atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="mt-4"><CardContent className="p-6 space-y-4 max-w-2xl">
      <div>
        <Label>Cor primária</Label>
        <div className="flex gap-2 items-center mt-1">
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
        </div>
      </div>
      <div>
        <Label>URL do logo</Label>
        <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
        {logo && <img src={logo} alt="" className="mt-2 w-20 h-20 rounded-md border object-cover" />}
      </div>
      <div className="p-4 rounded-md border" style={{ backgroundColor: color, color: "#fff" }}>
        <p className="font-semibold">Preview header</p>
        <p className="text-xs opacity-80">Assim ficará a página pública de agendamento.</p>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}
        className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">Salvar aparência</Button>
    </CardContent></Card>
  );
}

function CobrancaTab() {
  const { data: company } = useCurrentCompany();
  const { user, isSuperAdmin } = useAuth();
  return (
    <div className="mt-4 space-y-4">
      <Card><CardContent className="p-6 space-y-3 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-muted-foreground text-xs">Plano</Label>
            <p className="text-lg font-semibold capitalize">{company?.plano ?? "—"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Status</Label>
            <p><Badge variant="outline">{company?.status_cobranca}</Badge></p></div>
          <div><Label className="text-muted-foreground text-xs">Ciclo</Label>
            <p>{company?.ciclo}</p></div>
          <div><Label className="text-muted-foreground text-xs">Valor mensal</Label>
            <p>R$ {Number(company?.valor_mensal ?? 0).toFixed(2)}</p></div>
          <div><Label className="text-muted-foreground text-xs">Trial até</Label>
            <p>{company?.trial_ate ? format(parseISO(company.trial_ate), "dd/MM/yyyy") : "—"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Próximo vencimento</Label>
            <p>{company?.proximo_vencimento ? format(parseISO(company.proximo_vencimento), "dd/MM/yyyy") : "—"}</p></div>
        </div>
        <p className="text-xs text-muted-foreground pt-3">
          Conta logada: {user?.email} {isSuperAdmin && <Badge className="ml-2 bg-red-100 text-red-700">super admin</Badge>}
        </p>
      </CardContent></Card>
      {company?.id && <InvoicesList companyId={company.id} />}
    </div>
  );
}

function InvoicesList({ companyId }: { companyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices", companyId],
    queryFn: async () =>
      (await supabase.from("invoice_simulated").select("*").eq("company_id", companyId)
        .order("reference_month", { ascending: false }).limit(12)).data ?? [],
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-3">Últimas 12 faturas</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura emitida ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês de referência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="capitalize">{format(parseISO(inv.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>{format(parseISO(inv.due_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{formatBRL(inv.amount)}</TableCell>
                  <TableCell><InvoiceStatus status={inv.status} /></TableCell>
                  <TableCell>{inv.paid_at ? format(parseISO(inv.paid_at), "dd/MM/yyyy") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-emerald-100 text-emerald-700",
    pendente: "bg-amber-100 text-amber-700",
    vencido: "bg-red-100 text-red-700",
    cancelado: "bg-muted text-muted-foreground",
  };
  return <Badge className={`${map[status] ?? "bg-muted"} hover:${map[status] ?? "bg-muted"}`}>{status}</Badge>;
}

function FidelidadeTab() {
  const { data: company } = useCurrentCompany();
  const qc = useQueryClient();
  const [form, setForm] = useState({ fidelidade_ativa: false, fidelidade_meta: 10, fidelidade_premio: "" });

  useEffect(() => {
    if (company) {
      setForm({
        fidelidade_ativa: Boolean((company as any).fidelidade_ativa),
        fidelidade_meta: Number((company as any).fidelidade_meta ?? 10),
        fidelidade_premio: String((company as any).fidelidade_premio ?? ""),
      });
    }
  }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Sem empresa");
      const { error } = await supabase.from("company").update({
        fidelidade_ativa: form.fidelidade_ativa,
        fidelidade_meta: Math.max(1, form.fidelidade_meta || 1),
        fidelidade_premio: form.fidelidade_premio || null,
      } as any).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["current-company"] }); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card><CardContent className="p-6 space-y-4 max-w-xl">
      <div>
        <h3 className="font-semibold">Programa de fidelidade</h3>
        <p className="text-sm text-muted-foreground">Premiamos o cliente a cada N atendimentos concluídos.</p>
      </div>
      <div className="flex items-center justify-between border rounded-md p-3">
        <div>
          <p className="font-medium text-sm">Ativar fidelidade</p>
          <p className="text-xs text-muted-foreground">O contador só sobe quando uma comanda é fechada.</p>
        </div>
        <input type="checkbox" className="w-5 h-5 accent-[var(--brand)]"
          checked={form.fidelidade_ativa}
          onChange={(e) => setForm({ ...form, fidelidade_ativa: e.target.checked })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Meta (atendimentos)</Label>
          <Input type="number" min={1} value={form.fidelidade_meta}
            onChange={(e) => setForm({ ...form, fidelidade_meta: parseInt(e.target.value) || 1 })} />
        </div>
        <div>
          <Label>Prêmio</Label>
          <Input value={form.fidelidade_premio} placeholder="Ex: 1 corte grátis"
            onChange={(e) => setForm({ ...form, fidelidade_premio: e.target.value })} />
        </div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}
        className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">Salvar</Button>
    </CardContent></Card>
  );
}
