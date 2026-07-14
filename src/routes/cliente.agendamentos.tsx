import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientSession } from "@/hooks/use-client-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/cliente/agendamentos")({
  ssr: false,
  component: AgendamentosPage,
});

const formatBRL = (n: any) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

function AgendamentosPage() {
  const { session, loading } = useClientSession();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["client-appointments", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_appointments");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const items = (q.data ?? []) as any[];
  const now = new Date();
  const upcoming = items.filter((a) => new Date(a.scheduled_at) >= now && !["cancelado", "concluido", "nao_compareceu"].includes(a.status));
  const history = items.filter((a) => !upcoming.includes(a));

  const cancel = async (id: string) => {
    if (!confirm("Cancelar este agendamento?")) return;
    const { data, error } = await supabase.rpc("cancel_client_appointment", { _appointment_id: id });
    if (error || !data) return toast.error(error?.message ?? "Não foi possível cancelar");
    toast.success("Agendamento cancelado");
    qc.invalidateQueries({ queryKey: ["client-appointments"] });
    qc.invalidateQueries({ queryKey: ["client-next-appt"] });
    try {
      const { notifyAppointmentEvent } = await import("@/lib/email/notify.functions");
      void notifyAppointmentEvent({ data: { appointmentId: id, kind: "canceled" } });
    } catch (e) {
      console.error("[cliente] notify cancel failed", e);
    }
  };

  const renderCard = (a: any, allowCancel: boolean) => (
    <Card key={a.id}>
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{a.service_name}</div>
            <div className="text-sm text-muted-foreground">com {a.professional_name}</div>
          </div>
          <Badge variant={a.status === "cancelado" ? "destructive" : "secondary"}>{a.status}</Badge>
        </div>
        <div className="text-sm">{format(new Date(a.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
        <div className="text-sm text-muted-foreground">{a.company_name}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold">{formatBRL(a.price)}</span>
          {allowCancel && (
            <Button size="sm" variant="outline" onClick={() => cancel(a.id)}>Cancelar</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link to="/cliente"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button></Link>
          <span className="font-semibold">Meus agendamentos</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Próximos ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!q.isLoading && upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>}
            {upcoming.map((a) => renderCard(a, true))}
          </TabsContent>
          <TabsContent value="history" className="space-y-3 mt-4">
            {!q.isLoading && history.length === 0 && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
            {history.map((a) => renderCard(a, false))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
