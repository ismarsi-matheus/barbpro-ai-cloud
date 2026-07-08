import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, AlertCircle, Star, Clock, UserX, ArrowRight, Copy, MessageCircle,
} from "lucide-react";
import { demoAIInsights } from "@/lib/demo-data";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/demo/aigrowth")({ component: DemoAI });

const ICONS: Record<string, any> = {
  star: Star, clock: Clock, sparkles: Sparkles, "user-x": UserX, "alert-circle": AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700 border-red-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baixa: "bg-slate-100 text-slate-700 border-slate-200",
};

function DemoAI() {
  const totalImpact = demoAIInsights.reduce((s, i) => s + i.impact_estimate, 0);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "#1B3A4B" }}>AI Growth Engine</h1>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Beta</Badge>
          </div>
          <p className="text-sm text-black/60 mt-1">Insights baseados em seus dados em tempo real.</p>
        </div>
      </div>

      {/* Impact banner */}
      <Card className="text-white border-0" style={{ background: "linear-gradient(135deg, #1B3A4B, #2C5870)" }}>
        <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Oportunidade estimada esse mês</p>
              <p className="text-3xl font-black">{formatBRL(totalImpact)}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => toast.success("Disparando todas as ações sugeridas...")}>
            Executar todas as ações
          </Button>
        </CardContent>
      </Card>

      {/* Insight cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {demoAIInsights.map((ins) => {
          const Icon = ICONS[ins.icon ?? "sparkles"] ?? Sparkles;
          return (
            <Card key={ins.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{ins.title}</CardTitle>
                    <Badge variant="outline" className={`shrink-0 ${PRIORITY_COLORS[ins.priority]}`}>
                      {ins.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-black/70">{ins.description}</p>

                {ins.targets && (
                  <div className="rounded-lg bg-black/5 p-3">
                    <p className="text-[10px] uppercase text-black/50 font-semibold mb-2">
                      Clientes ({ins.targets.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ins.targets.slice(0, 6).map((n) => (
                        <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-white border border-black/5">{n}</span>
                      ))}
                      {ins.targets.length > 6 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-black/5">+{ins.targets.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}

                {ins.whatsapp_message && (
                  <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50/50 p-3">
                    <p className="text-[10px] uppercase text-emerald-700 font-semibold mb-1 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Mensagem WhatsApp pronta (clique pra copiar)
                    </p>
                    <p className="text-sm text-black/80 italic leading-relaxed">"{ins.whatsapp_message}"</p>
                    <Button
                      size="sm" variant="ghost"
                      className="mt-2 h-7 text-xs text-emerald-700 hover:bg-emerald-100"
                      onClick={() => copy(ins.whatsapp_message!)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar mensagem
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                  {ins.impact_estimate > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase text-black/50">Impacto estimado</p>
                      <p className="font-bold" style={{ color: "#1B3A4B" }}>+{formatBRL(ins.impact_estimate)}</p>
                    </div>
                  ) : <div />}
                  <Button
                    size="sm" className="text-white"
                    style={{ backgroundColor: "#1B3A4B" }}
                    onClick={() => toast.success(`Ação '${ins.action_label}' iniciada`)}
                  >
                    {ins.action_label} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
