import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Trash2, MoreHorizontal, KeyRound, Link as LinkIcon, Copy, Check, AlertTriangle, LogIn,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { resetAdminPassword } from "@/lib/users.functions";

export const Route = createFileRoute("/master/listaBarbearias")({ component: ListaPage });

function ListaPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const impersonate = (companyId: string) => {
    sessionStorage.setItem("master_impersonate_company", companyId);
    qc.invalidateQueries({ queryKey: ["current-company"] });
    navigate({ to: "/app/dashboard" });
  };
  const { data = [] } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () =>
      (await supabase.from("company").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status_cobranca }: any) => {
      const { error } = await supabase.from("company").update({ status_cobranca }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-companies"] }); toast.success("Status atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-companies"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ----- estados para reset de senha -----
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);
  const [creds, setCreds] = useState<{
    email: string; tempPassword: string; companyName: string; slug?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState<"email" | "pwd" | "both" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async (text: string, key: "email" | "pwd" | "both") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyBookingLink = async (slug: string | null | undefined) => {
    if (!slug) { toast.error("Esta barbearia ainda não tem slug definido"); return; }
    await navigator.clipboard.writeText(`${origin}/agendar/${slug}`);
    toast.success("Link de agendamento copiado!");
  };

  const resetFn = useServerFn(resetAdminPassword);
  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await resetFn({ data: { company_id: resetTarget.id } });
      const companyName = resetTarget.nome_fantasia || resetTarget.name;
      setCreds({ email: res.email, tempPassword: res.tempPassword, companyName, slug: resetTarget.slug });
      setResetTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao resetar senha");
    } finally {
      setResetting(false);
    }
  };

  const whatsAppText = creds
    ? `Olá! Sua senha de acesso à BarbeiroPro AI foi redefinida.\n\nPainel: ${origin}/entrar\nEmail: ${creds.email}\nSenha temporária: ${creds.tempPassword}\n\nNo primeiro login você precisará trocar a senha.`
    : "";

  return (
    <div>
      <PageHeader title="Barbearias" description="Todas as contas do sistema" />
      <DataTable
        data={data as any[]}
        searchableKeys={["name", "nome_fantasia", "slug", "email_contato"]}
        columns={[
          { key: "name", header: "Nome", render: (r) => r.nome_fantasia || r.name },
          { key: "slug", header: "Slug" },
          { key: "plano", header: "Plano" },
          {
            key: "status_cobranca", header: "Status",
            render: (r) => (
              <Select value={r.status_cobranca} onValueChange={(v) => updateStatus.mutate({ id: r.id, status_cobranca: v })}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">trial</SelectItem>
                  <SelectItem value="ativo">ativo</SelectItem>
                  <SelectItem value="atrasado">atrasado</SelectItem>
                  <SelectItem value="cancelado">cancelado</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
          { key: "created_at", header: "Criada", render: (r) => format(parseISO(r.created_at), "dd/MM/yyyy") },
          {
            key: "actions", header: "", className: "text-right",
            render: (r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => impersonate(r.id)}>
                    <LogIn className="w-4 h-4 mr-2" /> Entrar como
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResetTarget(r)}>
                    <KeyRound className="w-4 h-4 mr-2" /> Resetar senha do admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyBookingLink(r.slug)}>
                    <LinkIcon className="w-4 h-4 mr-2" /> Copiar link de agendamento
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(r)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remover barbearia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      {/* Confirmação de reset */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar senha do admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Uma nova senha temporária será gerada e a senha atual deixará de funcionar imediatamente.
              {resetTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  Barbearia: {resetTarget.nome_fantasia || resetTarget.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={(e) => { e.preventDefault(); confirmReset(); }}
              className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
            >
              {resetting ? "Gerando…" : "Gerar nova senha"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover barbearia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e remove a conta {deleteTarget?.nome_fantasia || deleteTarget?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) remove.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de credenciais (mesmo padrão da criação) */}
      <Dialog open={!!creds} onOpenChange={(o) => { if (!o) setCreds(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova senha gerada</DialogTitle>
            <DialogDescription>
              Copie e envie estas credenciais ao responsável. A senha <b>não será mostrada novamente</b>.
              No próximo login, será exigida a troca de senha.
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
                <Label className="text-xs">Senha temporária</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creds.tempPassword} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(creds.tempPassword, "pwd")}>
                    {copied === "pwd" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Guarde antes de fechar. O super admin não consegue ver esta senha novamente — só gerar outra.</p>
              </div>

              <Button
                type="button"
                className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                onClick={() => copy(whatsAppText, "both")}
              >
                {copied === "both"
                  ? <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                  : <><Copy className="w-4 h-4 mr-2" /> Copiar tudo (formato WhatsApp)</>}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreds(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
