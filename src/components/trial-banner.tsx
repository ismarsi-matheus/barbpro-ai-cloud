import { Scissors, CheckCircle2, AlertCircle, Calendar, Clock, BarChart3, Users, Crown, Sparkles } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Link } from "@tanstack/react-router";

export function TrialBanner({ company }: { company: any }) {
  if (!company || company.status_cobranca !== "trial") return null;

  const trialEnd = company.trial_ate ? parseISO(company.trial_ate) : null;
  if (!trialEnd) return null;

  const now = new Date();
  const daysLeft = differenceInDays(trialEnd, now);
  const expired = daysLeft < 0;

  if (expired) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-500">
        <AlertCircle className="w-4 h-4" />
        <span>Seu período de teste expirou hoje. Escolha um plano para continuar usando o BarbeiroPro.</span>
        <Button asChild size="sm" variant="secondary" className="h-7 text-xs font-bold px-3">
          <Link to="/app/checkout">Ver Planos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm font-medium transition-colors border-b border-white/10",
      daysLeft <= 3 ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
    )}>
      <Clock className="w-4 h-4 hidden sm:block" />
      <span>
        Você está no <b>Período de Teste</b>. Restam <b>{daysLeft === 0 ? "menos de 1 dia" : `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}</b>.
      </span>
      <Button asChild size="sm" variant="secondary" className="h-6 text-[10px] font-bold px-2 py-0 bg-white/20 hover:bg-white/30 text-white border-0">
        <Link to="/app/checkout">Ativar Plano</Link>
      </Button>
    </div>
  );
}
