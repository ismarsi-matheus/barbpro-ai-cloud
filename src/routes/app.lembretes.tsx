import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, MessageCircle, Calendar, Sparkles } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { featureEnabled, normalizePlanSlug } from "@/lib/plan-features";

export const Route = createFileRoute("/app/lembretes")({ component: LembretesPage });

function normalizePhone(raw: string | null | undefined) {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
}

function buildMessage(tipo: "d1" | "d0", nome: string, hora: string, barbearia: string, link: string) {
  if (tipo === "d1") {
    return `Oi ${nome}! Confirmando seu horário amanhã às ${hora} na ${barbearia}. Confirma aqui: ${link}`;
  }
  return `Oi ${nome}! Seu horário é hoje às ${hora}. Te espero! Confirmar/cancelar: ${link}`;
}

function LembretesPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const planSlug = normalizePlanSlug((company as any)?.selected_plan_slug ?? (company as any)?.plano);
  const allowed = featureEnabled(planSlug, "lembretesWhatsapp");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const barbearia = (company as any)?.nome_fantasia ?? (company as any)?.name ?? "barbearia";

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const endTomorrow = endOfDay(tomorrow);

  const { data: apts = [] } = useQuery({
    queryKey: ["lembretes", cid],
    enabled: !!cid && allowed,
    queryFn: async () =>
      (await supabase.from("appointment").select("*")
        .eq("company_id", cid!)
        .gte("scheduled_at", today.toISOString())
        .lte("scheduled_at", endTomorrow.toISOString())
        .order("scheduled_at")).data ?? [],
  });

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Lembretes WhatsApp" description="Reduza faltas com 1 clique" />
        <Card><CardContent className="p-8 text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">Disponível no plano Pro ou superior</p>
          <p className="text-sm text-muted-foreground">Envie lembretes de confirmação em segundos pelo WhatsApp da barbearia.</p>
          <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <a href="/app/checkout">Fazer upgrade</a>
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const todayApts = (apts as any[]).filter((a) => parseISO(a.scheduled_at) < endOfDay(today));
  const tomorrowApts = (apts as any[]).filter((a) => parseISO(a.scheduled_at) >= tomorrow);

  return (
    <div className="space-y-4">
      <PageHeader title="Lembretes WhatsApp" description="Envie lembretes para os agendamentos de hoje e amanhã" />

      <Tabs defaultValue="amanha">
        <TabsList>
          <TabsTrigger value="amanha"><Sparkles className="w-3.5 h-3.5 mr-1" /> Amanhã ({tomorrowApts.length})</TabsTrigger>
          <TabsTrigger value="hoje"><Calendar className="w-3.5 h-3.5 mr-1" /> Hoje ({todayApts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="amanha"><List items={tomorrowApts} tipo="d1" origin={origin} barbearia={barbearia} /></TabsContent>
        <TabsContent value="hoje"><List items={todayApts} tipo="d0" origin={origin} barbearia={barbearia} /></TabsContent>
      </Tabs>
    </div>
  );
}

function List({ items, tipo, origin, barbearia }: { items: any[]; tipo: "d1" | "d0"; origin: string; barbearia: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-8 text-center">Sem agendamentos.</p>;
  }
  return (
    <div className="space-y-2 pt-3">
      {items.map((a) => {
        const phone = normalizePhone(a.customer_phone);
        const hora = format(parseISO(a.scheduled_at), "HH:mm");
        const link = `${origin}/confirmar/${a.confirm_token}`;
        const msg = buildMessage(tipo, a.customer_name ?? "tudo bem?", hora, barbearia, link);
        const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null;
        const stColor: Record<string, string> = {
          agendado: "bg-amber-100 text-amber-800",
          confirmado: "bg-emerald-100 text-emerald-800",
          cancelado: "bg-slate-200 text-slate-700",
          concluido: "bg-blue-100 text-blue-800",
          nao_compareceu: "bg-rose-100 text-rose-800",
          em_andamento: "bg-violet-100 text-violet-800",
        };
        return (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="text-center px-2 py-1 rounded bg-muted/40 min-w-[60px]">
                <p className="text-xs text-muted-foreground">{format(parseISO(a.scheduled_at), "dd/MM")}</p>
                <p className="text-sm font-bold">{hora}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{a.customer_name ?? "—"}</span>
                  <Badge className={stColor[a.status] ?? ""}>{a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {a.service_name} {a.professional_name && `• ${a.professional_name}`} • {a.customer_phone ?? "sem telefone"}
                </p>
              </div>
              {waUrl ? (
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                  </a>
                </Button>
              ) : (
                <Button size="sm" disabled variant="outline">Sem telefone</Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
