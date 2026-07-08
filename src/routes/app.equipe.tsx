import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Copy, Check, KeyRound, Power, Trash2, MoreHorizontal, Shuffle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  createTeamMember, updateTeamMemberRole, setTeamMemberActive,
  resetTeamMemberPassword, removeTeamMember,
} from "@/lib/users.functions";

export const Route = createFileRoute("/app/equipe")({ component: EquipePage });

const ROLES = [
  { v: "owner", label: "Dono" },
  { v: "admin", label: "Admin" },
  { v: "financeiro", label: "Financeiro" },
  { v: "barbeiro", label: "Barbeiro" },
  { v: "recepcao", label: "Recepção" },
] as const;

type Role = (typeof ROLES)[number]["v"];

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = ""; const r = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) out += chars[r[i] % chars.length];
  return out;
}

function EquipePage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const qc = useQueryClient();

  const createFn = useServerFn(createTeamMember);
  const updateRoleFn = useServerFn(updateTeamMemberRole);
  const setActiveFn = useServerFn(setTeamMemberActive);
  const resetFn = useServerFn(resetTeamMemberPassword);
  const removeFn = useServerFn(removeTeamMember);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ email: string; nome: string; role: Role; password: string; generated: boolean }>({
    email: "", nome: "", role: "barbeiro", password: "", generated: false,
  });
  const [creds, setCreds] = useState<{ email: string; password: string; generated: boolean } | null>(null);
  const [copied, setCopied] = useState<"email" | "pwd" | "both" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["team", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("company_user").select("*").eq("company_id", cid!).order("created_at")).data ?? [],
  });

  const copy = async (text: string, key: "email" | "pwd" | "both") => {
    await navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cid) return;
    if (!form.email.trim()) { toast.error("Email obrigatório"); return; }
    setSaving(true);
    try {
      const password = form.password || genPassword();
      const generated = !form.password;
      const res = await createFn({ data: {
        company_id: cid, email: form.email.trim(), nome: form.nome.trim(),
        role: form.role, password, generate_password: generated,
      } });
      setOpen(false);
      setForm({ email: "", nome: "", role: "barbeiro", password: "", generated: false });
      setCreds({ email: res.email, password: res.password, generated: res.generated });
      qc.invalidateQueries({ queryKey: ["team", cid] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar membro");
    } finally { setSaving(false); }
  };

  const changeRole = async (member_id: string, role: Role) => {
    if (!cid) return;
    try {
      await updateRoleFn({ data: { company_id: cid, member_id, role } });
      qc.invalidateQueries({ queryKey: ["team", cid] });
      toast.success("Papel atualizado");
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (member_id: string, ativo: boolean) => {
    if (!cid) return;
    try {
      await setActiveFn({ data: { company_id: cid, member_id, ativo } });
      qc.invalidateQueries({ queryKey: ["team", cid] });
      toast.success(ativo ? "Membro ativado" : "Membro desativado");
    } catch (err: any) { toast.error(err.message); }
  };

  const resetPwd = async (member_id: string) => {
    if (!cid) return;
    try {
      const res = await resetFn({ data: { company_id: cid, member_id } });
      setCreds({ email: res.email, password: res.password, generated: res.generated });
      qc.invalidateQueries({ queryKey: ["team", cid] });
    } catch (err: any) { toast.error(err.message); }
  };

  const doRemove = async (member_id: string) => {
    if (!cid) return;
    try {
      await removeFn({ data: { company_id: cid, member_id } });
      qc.invalidateQueries({ queryKey: ["team", cid] });
      toast.success("Removido");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Acesso interno — sem envio de email. Mostre as credenciais na tela e envie por WhatsApp."
        action={
          <Button onClick={() => setOpen(true)} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Plus className="w-4 h-4 mr-1" /> Adicionar membro
          </Button>
        }
      />

      <DataTable
        data={data as any[]}
        searchableKeys={["email", "nome"]}
        columns={[
          { key: "nome", header: "Nome", render: (r) => r.nome || "—" },
          { key: "email", header: "Email" },
          {
            key: "role", header: "Papel",
            render: (r) => (
              <Select value={r.role} onValueChange={(v) => changeRole(r.id, v as Role)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((x) => <SelectItem key={x.v} value={x.v}>{x.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ),
          },
          {
            key: "status", header: "Status",
            render: (r) => r.ativo
              ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>
              : <Badge variant="secondary">Inativo</Badge>,
          },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => resetPwd(r.id)}>
                    <KeyRound className="w-4 h-4 mr-2" /> Redefinir senha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleActive(r.id, !r.ativo)}>
                    <Power className="w-4 h-4 mr-2" /> {r.ativo ? "Desativar" : "Ativar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(r)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      {/* Dialog: novo membro */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-3">
            <DialogHeader>
              <DialogTitle>Adicionar membro</DialogTitle>
              <DialogDescription>
                Acesso criado na hora. Sem envio de email — as credenciais aparecem na tela.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label>Email *</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((x) => <SelectItem key={x.v} value={x.v}>{x.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Senha</Label>
              <div className="flex gap-2">
                <Input
                  value={form.password}
                  placeholder="Mínimo 6 caracteres (ou gere automaticamente)"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: genPassword() })}>
                  <Shuffle className="w-4 h-4 mr-1" /> Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Se a senha for gerada, o membro será obrigado a trocá-la no primeiro login.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
                {saving ? "Criando…" : "Criar acesso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de credenciais */}
      <Dialog open={!!creds} onOpenChange={(o) => { if (!o) setCreds(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso pronto</DialogTitle>
            <DialogDescription>
              Envie estes dados para a pessoa. Ela entra em <b>/entrar</b>. A senha não será mostrada novamente.
            </DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creds.email} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(creds.email, "email")}>
                    {copied === "email" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Senha</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creds.password} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(creds.password, "pwd")}>
                    {copied === "pwd" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                onClick={() => copy(`Email: ${creds.email}\nSenha: ${creds.password}\nPainel: ${window.location.origin}/entrar`, "both")}
              >
                {copied === "both" ? <><Check className="w-4 h-4 mr-2" /> Copiado!</> : <><Copy className="w-4 h-4 mr-2" /> Copiar tudo</>}
              </Button>
              {creds.generated && (
                <p className="text-xs text-muted-foreground">
                  Senha gerada automaticamente — no primeiro login será exigida a troca.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreds(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar remoção */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nome || deleteTarget?.email} perderá acesso ao painel desta barbearia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleteTarget) doRemove(deleteTarget.id); setDeleteTarget(null); }}
            >Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
