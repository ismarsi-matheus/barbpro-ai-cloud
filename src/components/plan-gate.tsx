import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLAN_LABEL, type PlanSlug } from "@/lib/subscription/subscription-core";

/**
 * Estado padrão de recurso bloqueado por plano.
 * Sempre leva para a Central de Assinatura (mantém a sessão autenticada).
 */
export function FeatureLocked({
  title,
  description,
  requiredPlan = "pro",
}: {
  title: string;
  description: string;
  requiredPlan?: PlanSlug;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 sm:p-10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-lg">
            Disponível no plano {PLAN_LABEL[requiredPlan]} ou superior
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Link to="/app/assinatura">
              <Sparkles className="w-4 h-4 mr-1" /> Ver planos e fazer upgrade
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-1">{title}</p>
      </CardContent>
    </Card>
  );
}
