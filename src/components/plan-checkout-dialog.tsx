import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkEmailExists, signupTrial } from "@/lib/auth-signup.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

type Plan = { slug: string; name: string; price: number; trial_days?: number };

type Step = "email" | "login" | "signup";

export function PlanCheckoutDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
}) {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkEmailExists);
  const signupFn = useServerFn(signupTrial);

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  const reset = () => {
    setStep("email");
    setEmail("");
    setPassword("");
    setNome("");
    setCpf("");
    setPhone("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { exists } = await checkFn({ data: { email } });
      setStep(exists ? "login" : "signup");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao verificar email");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Senha incorreta. Tente novamente.");
    toast.success("Bem-vindo de volta!");
    onOpenChange(false);
    navigate({ to: "/app/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signupFn({
        data: { email, password, nome, cpf, phone, plan_slug: plan?.slug },
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Conta criada! Bem-vindo.");
      onOpenChange(false);
      navigate({ to: "/app/onboarding" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {plan ? `Plano ${plan.name}` : "Escolha seu plano"}
          </DialogTitle>
          <DialogDescription>
            {step === "email" && "Comece informando seu email."}
            {step === "login" && "Já existe uma conta com este email. Faça login para continuar."}
            {step === "signup" && `Crie sua conta. ${plan?.trial_days ?? 14} dias grátis pra testar.`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleEmailNext} className="space-y-3">
            <div>
              <Label htmlFor="ck-email">Email</Label>
              <Input id="ck-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continuar
            </Button>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <BackButton onClick={() => setStep("email")} />
            <div>
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label htmlFor="ck-pwd">Senha</Label>
              <Input id="ck-pwd" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Entrar e continuar
            </Button>
          </form>
        )}

        {step === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3">
            <BackButton onClick={() => setStep("email")} />
            <div>
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label htmlFor="ck-nome">Seu nome completo</Label>
              <Input id="ck-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ck-cpf">CPF</Label>
                <Input id="ck-cpf" required value={cpf} placeholder="000.000.000-00"
                  onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ck-phone">WhatsApp</Label>
                <Input id="ck-phone" required value={phone} placeholder="(11) 90000-0000"
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ck-newpwd">Crie uma senha</Label>
              <Input id="ck-newpwd" type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar conta e começar trial
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Ao criar a conta você aceita os Termos. Sem cobrança automática no fim do trial.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
      <ArrowLeft className="w-3 h-3" /> voltar
    </button>
  );
}
