import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { AlertTriangle, CheckCircle2, Loader2, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-senha")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — BarbeiroPro AI" },
      {
        name: "description",
        content: "Defina uma nova senha para acessar sua conta no BarbeiroPro AI.",
      },
      { property: "og:title", content: "Criar nova senha — BarbeiroPro AI" },
      {
        property: "og:description",
        content: "Defina uma nova senha para acessar sua conta no BarbeiroPro AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

type LinkState = "checking" | "valid" | "invalid";

const MIN_LEN = 8;

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= MIN_LEN) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABEL = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLOR = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

function ResetPage() {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;
    const markValid = () => {
      settled = true;
      setLinkState("valid");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) markValid();
    });

    // O link de recuperação chega com erro explícito quando expirado/inválido.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    if (hash.get("error") || search.get("error")) {
      settled = true;
      setLinkState("invalid");
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (settled) return;
        if (data.session) markValid();
        else setLinkState("invalid");
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const score = strengthOf(password);
  const tooShort = password.length > 0 && password.length < MIN_LEN;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    linkState === "valid" && password.length >= MIN_LEN && confirm === password && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (/expired|invalid|session/i.test(error.message)) {
        setLinkState("invalid");
        return;
      }
      toast.error(error.message);
      return;
    }
    // Encerra a sessão de recuperação: o usuário entra novamente com a nova senha.
    await supabase.auth.signOut();
    setDone(true);
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
          <CardTitle>{done ? "Senha alterada" : "Crie uma nova senha"}</CardTitle>
          <CardDescription>
            {done
              ? "Você já pode entrar com a nova senha."
              : "Escolha uma senha com pelo menos 8 caracteres."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p className="text-sm">Senha alterada com sucesso.</p>
              </div>
              <Button
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
                onClick={() => navigate({ to: "/entrar" })}
              >
                Entrar novamente
              </Button>
            </div>
          ) : linkState === "checking" ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando o link…
            </div>
          ) : linkState === "invalid" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  Este link de recuperação é inválido ou expirou. Solicite um novo
                  link para redefinir sua senha.
                </p>
              </div>
              <Button asChild className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_LEN}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1" aria-hidden>
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            i < score ? STRENGTH_COLOR[score] : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha: {STRENGTH_LABEL[score]}
                    </p>
                  </div>
                )}
                {tooShort && (
                  <p className="text-xs text-destructive">
                    A senha deve ter pelo menos {MIN_LEN} caracteres.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {mismatch && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
              </div>

              <Button
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
                disabled={!canSubmit}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
