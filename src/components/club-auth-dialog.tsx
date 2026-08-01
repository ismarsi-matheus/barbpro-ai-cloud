import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot";

/**
 * Modal de autenticação usado no fluxo do Clube dentro do agendamento público.
 * Permite login, cadastro e recuperação de senha sem sair da página.
 */
export function ClubAuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAuthenticated?: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPassword("");
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        onOpenChange(false);
        onAuthenticated?.();
      } else if (mode === "signup") {
        if (password.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined,
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          toast.success("Conta criada!");
          onOpenChange(false);
          onAuthenticated?.();
        } else {
          toast.success("Enviamos um e-mail para confirmar sua conta.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/reset-senha` : undefined,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível continuar");
    } finally {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mb-1">
            <Crown className="w-6 h-6 text-[var(--brand)]" />
          </div>
          <DialogTitle className="text-center">
            {mode === "login"
              ? "Entrar no Clube"
              : mode === "signup"
                ? "Criar sua conta"
                : "Recuperar senha"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "forgot"
              ? "Informe seu e-mail e enviaremos um link para redefinir a senha."
              : "Acesse sua conta para usar os benefícios do Clube."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="club-name">Nome completo</Label>
                <Input
                  id="club-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="club-phone">Telefone (WhatsApp)</Label>
                <Input
                  id="club-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  autoComplete="tel"
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="club-email">E-mail</Label>
            <Input
              id="club-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="club-pass">Senha</Label>
              <Input
                id="club-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>

        <div className="text-center text-sm space-y-1 pt-1">
          {mode === "login" && (
            <>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => setMode("forgot")}
              >
                Esqueci minha senha
              </button>
              <p className="text-muted-foreground">
                Não tem conta?{" "}
                <button
                  type="button"
                  className="text-[var(--brand)] font-medium hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Cadastre-se
                </button>
              </p>
            </>
          )}
          {mode !== "login" && (
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => setMode("login")}
            >
              ← Voltar para o login
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
