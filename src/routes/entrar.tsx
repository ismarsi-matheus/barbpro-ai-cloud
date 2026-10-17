import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkEmailExists, signupTrial } from "@/lib/auth-signup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors, ArrowLeft, Loader2 } from "lucide-react";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({ next: oauthReturnPath(search.next) }),
  head: () => ({ meta: [
    { title: "Acessar sua barbearia — BarbeiroPro AI" },
    { name: "description", content: "Entre na sua conta do BarbeiroPro AI para gerenciar sua barbearia." },
    { property: "og:title", content: "Acessar sua barbearia — BarbeiroPro AI" },
    { property: "og:description", content: "Acesse a gestão da sua barbearia no BarbeiroPro AI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: EntrarPage,
});

type Step = "email" | "login" | "signup";

function EntrarPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const checkFn = useServerFn(checkEmailExists);
  const signupFn = useServerFn(signupTrial);

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

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
    if (error) return toast.error("Senha incorreta.");
    toast.success("Bem-vindo de volta!");
    navigate({ href: next === "/" ? "/app/dashboard" : next });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signupFn({ data: { email, password, nome, cpf, phone } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ href: next === "/" ? "/app/onboarding" : next });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface)] px-4 py-10">
      <Link
        to="/"
        className="self-center mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o início
      </Link>
      <Link to="/" className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
          <Scissors className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight">BarbeiroPro AI</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === "email" ? "Acessar sua conta" : "Criar sua conta"}
          </CardTitle>
          <CardDescription>
            {step === "email" && "Gestão profissional para barbearias"}
            {step === "login" && "Já temos seu e-mail cadastrado."}
            {step === "signup" && "Dados para o período de teste grátis"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={handleEmailNext} className="space-y-4">
              <Label>E-mail</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full bg-[var(--brand)] text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </form>
          )}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <button type="button" onClick={() => setStep("email")} className="text-xs text-muted-foreground flex items-center hover:underline"><ArrowLeft className="w-3 h-3 mr-1" /> Voltar</button>
              <Label>E-mail</Label>
              <Input value={email} disabled />
              <Label>Senha</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full bg-[var(--brand)] text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <div className="flex items-center justify-between text-xs">
                <Link to="/esqueci-senha" className="text-[var(--brand)] hover:underline">
                  Esqueci minha senha
                </Link>
                <button
                  type="button"
                  onClick={() => setStep("signup")}
                  className="text-muted-foreground hover:underline"
                >
                  Criar conta
                </button>
              </div>
            </form>
          )}

          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <button type="button" onClick={() => setStep("email")} className="text-xs text-muted-foreground flex items-center hover:underline"><ArrowLeft className="w-3 h-3 mr-1" /> Voltar</button>
              <Label>Seu Nome</Label>
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              <Label>CPF</Label>
              <Input required value={cpf} placeholder="000.000.000-00" onChange={(e) => setCpf(e.target.value)} />
              <Label>WhatsApp</Label>
              <Input required value={phone} placeholder="(00) 00000-0000" onChange={(e) => setPhone(e.target.value)} />
              <Label>Senha</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full bg-[var(--brand)] text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
