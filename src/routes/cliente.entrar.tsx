import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/cliente/entrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar na Área do Cliente — BarbeiroPro" },
      { name: "description", content: "Acesse seus agendamentos, histórico e benefícios do Clube da sua barbearia." },
      { property: "og:title", content: "Entrar na Área do Cliente — BarbeiroPro" },
      { property: "og:description", content: "Acesse seus agendamentos, histórico e benefícios do Clube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClienteEntrar,
});

function ClienteEntrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cliente" });
    });
  }, [navigate]);

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/cliente",
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Não foi possível entrar.");
    }
    if (result.redirected) return;
    navigate({ to: "/cliente" });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/cliente" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/cliente`,
          data: { full_name: nome, phone },
        },
      });
      if (error) throw error;
      if (data.session) {
        await supabase.from("client_profile").upsert({
          user_id: data.user!.id,
          full_name: nome,
          phone,
          email,
        });
        toast.success("Conta criada!");
        navigate({ to: "/cliente" });
      } else {
        toast.success("Confira seu email para confirmar a conta.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-senha`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email de recuperação enviado!");
    setTab("signin");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface)] px-4 py-10">
      <Link to="/" className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
          <Scissors className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight">BarbeiroPro AI</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Área do Cliente</CardTitle>
          <CardDescription>Acesse sua conta ou crie uma agora</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => oauth("google")}>
              Continuar com Google
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => oauth("apple")}>
              Continuar com Apple
            </Button>
          </div>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou com email</span>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="forgot">Esqueci</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div><Label>Nome</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
                <div><Label>Telefone (WhatsApp)</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="forgot">
              <form onSubmit={handleForgot} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
