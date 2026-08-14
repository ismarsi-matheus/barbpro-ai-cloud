import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, MailCheck, Scissors } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Esqueci minha senha — BarbeiroPro AI" },
      {
        name: "description",
        content: "Recupere o acesso à sua conta BarbeiroPro AI com um link seguro de redefinição de senha.",
      },
      { property: "og:title", content: "Esqueci minha senha — BarbeiroPro AI" },
      {
        property: "og:description",
        content: "Recupere o acesso à sua conta BarbeiroPro AI com um link seguro de redefinição de senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EsqueciPage,
});

function EsqueciPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setLoading(true);
    // Nunca revelamos se o e-mail existe: erros são registrados, não exibidos.
    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/reset-senha`,
    });
    setLoading(false);
    if (error) {
      console.error("[reset-password]", error.message);
      if (error.status === 429) {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
    }
    setSent(true);
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
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>
            Enviaremos um link para você criar uma nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <MailCheck className="mt-0.5 h-5 w-5 text-[var(--brand)]" />
                <p className="text-sm text-muted-foreground">
                  Se existir uma conta com este e-mail, enviaremos um link para
                  redefinição de senha. Verifique também a caixa de spam.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/entrar">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </Button>
              <Link
                to="/entrar"
                className="block text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
