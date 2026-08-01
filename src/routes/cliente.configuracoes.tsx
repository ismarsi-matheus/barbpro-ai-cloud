import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, Loader2, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ClientShell } from "@/components/client/client-shell";
import { useClientDashboard, useClientSession } from "@/hooks/use-client-account";
import { deleteMyAccount } from "@/lib/client-area/client-account.functions";

export const Route = createFileRoute("/cliente/configuracoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurações da conta — BarbeiroPro" },
      { name: "description", content: "Segurança, aparência e exclusão de conta." },
      { property: "og:title", content: "Configurações da conta — BarbeiroPro" },
      { property: "og:description", content: "Segurança, aparência e exclusão de conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfiguracoesPage,
});

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  localStorage.setItem("bp-client-theme", theme);
}

function ConfiguracoesPage() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme>("system");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("bp-client-theme") as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const changeTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    toast.success("Aparência atualizada");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    if (password !== confirmPassword) return toast.error("As senhas não coincidem.");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirmPassword("");
    toast.success("Senha alterada com sucesso!");
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Sua conta foi excluída.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a conta.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <ClientShell
      title="Configurações"
      subtitle="Segurança, aparência e conta"
      user={{
        name: dash.data?.profile?.full_name,
        email: session?.user.email,
        photo: dash.data?.profile?.photo_url,
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aparência</CardTitle>
            <CardDescription>Escolha o tema da sua área</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => changeTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
                  theme === t.value
                    ? "border-[var(--brand)] bg-[var(--brand)]/5"
                    : "hover:border-[var(--brand)]",
                )}
              >
                <t.icon className="h-5 w-5 text-[var(--brand)]" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-[var(--brand)]" /> Alterar senha
            </CardTitle>
            <CardDescription>Use ao menos 6 caracteres</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nova">Nova senha</Label>
                <Input
                  id="nova"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="conf">Confirmar senha</Label>
                <Input
                  id="conf"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar nova senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" /> Excluir minha conta
            </CardTitle>
            <CardDescription>
              Seus dados pessoais são removidos e seus agendamentos futuros cancelados. Esta ação é
              irreversível.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              Excluir conta
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Não é possível desfazer. Você perderá acesso ao histórico, benefícios do Clube e
              agendamentos futuros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter conta</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={removeAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientShell>
  );
}
