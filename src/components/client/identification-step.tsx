import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubAuthDialog } from "@/components/club-auth-dialog";
import { ArrowRight, Check, LogIn, UserPlus, UserRound } from "lucide-react";

/**
 * Etapa "Identificação" do agendamento público.
 * Cliente pode entrar, criar conta ou seguir como visitante.
 */
export function IdentificationStep({
  onBack,
  onAuthenticated,
  onGuest,
}: {
  onBack: () => void;
  onAuthenticated: () => void;
  onGuest: () => void;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const open = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <Card className="animate-in fade-in-50 duration-300">
        <CardHeader>
          <CardTitle>Como deseja continuar?</CardTitle>
          <CardDescription>
            Com uma conta você acompanha seus horários, histórico e benefícios do Clube.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="relative flex flex-col rounded-xl border-2 border-[var(--brand)]/30 bg-[var(--brand)]/[0.03] p-5 transition-all duration-200 hover:shadow-md">
            <Badge className="absolute right-3 top-3 bg-[var(--brand)] text-white">
              Recomendado
            </Badge>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand)]/10">
              <LogIn className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <h3 className="text-base font-semibold">Já tenho conta</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              Seus dados são preenchidos automaticamente.
            </p>
            <Button
              className="mt-3 w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
              onClick={() => open("login")}
            >
              Entrar
            </Button>
          </div>

          <div className="flex flex-col rounded-xl border p-5 transition-all duration-200 hover:border-[var(--brand)] hover:shadow-md">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <UserPlus className="h-5 w-5 text-foreground/70" />
            </div>
            <h3 className="text-base font-semibold">Criar minha conta</h3>
            <ul className="mt-1 flex-1 space-y-1 text-sm text-muted-foreground">
              <li className="flex gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" /> Histórico completo
              </li>
              <li className="flex gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" /> Clube e benefícios
              </li>
            </ul>
            <Button variant="outline" className="mt-3 w-full" onClick={() => open("signup")}>
              Criar conta
            </Button>
          </div>

          <div className="flex flex-col rounded-xl border p-5 transition-all duration-200 hover:border-[var(--brand)] hover:shadow-md">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <UserRound className="h-5 w-5 text-foreground/70" />
            </div>
            <h3 className="text-base font-semibold">Continuar como visitante</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              Agende informando apenas nome e telefone.
            </p>
            <Button variant="ghost" className="mt-3 w-full" onClick={onGuest}>
              Continuar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Voltar
          </Button>
        </CardContent>
      </Card>

      <ClubAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        onAuthenticated={onAuthenticated}
      />
    </>
  );
}
