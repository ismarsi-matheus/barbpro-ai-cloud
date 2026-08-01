import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, BellOff, CalendarCheck, Clock, CreditCard, Crown, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientShell } from "@/components/client/client-shell";
import {
  useClientAppointments,
  useClientDashboard,
  useClientNotifications,
  useClientPayments,
  useClientSession,
  type ClientNotification,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/notificacoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notificações — BarbeiroPro" },
      { name: "description", content: "Lembretes, confirmações e novidades do seu Clube." },
      { property: "og:title", content: "Notificações — BarbeiroPro" },
      { property: "og:description", content: "Lembretes, confirmações e novidades do seu Clube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificacoesPage,
});

const ICONS: Record<ClientNotification["kind"], typeof Bell> = {
  agendamento: CalendarCheck,
  lembrete: Clock,
  pagamento: CreditCard,
  clube: Crown,
  avaliacao: Star,
};

const LABELS: Record<ClientNotification["kind"], string> = {
  agendamento: "Agendamento",
  lembrete: "Lembrete",
  pagamento: "Pagamento",
  clube: "Clube",
  avaliacao: "Avaliação",
};

function NotificacoesPage() {
  const { session } = useClientSession();
  const appointmentsQ = useClientAppointments(session?.user.id);
  const dash = useClientDashboard(session?.user.id);
  const paymentsQ = useClientPayments(session?.user.id);
  const notifications = useClientNotifications(appointmentsQ.data, dash.data, paymentsQ.data);

  const [filter, setFilter] = useState("todas");
  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";

  const list =
    filter === "todas" ? notifications : notifications.filter((n) => n.kind === filter);

  return (
    <ClientShell
      title="Notificações"
      subtitle={`${notifications.length} atualização(ões) na sua conta`}
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
    >
      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="lembrete">Lembretes</TabsTrigger>
          <TabsTrigger value="agendamento">Agenda</TabsTrigger>
          <TabsTrigger value="clube" className="hidden sm:flex">
            Clube
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="hidden sm:flex">
            Pagamentos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {appointmentsQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma notificação</p>
            <p className="text-sm text-muted-foreground">
              Avisos de horários, pagamentos e benefícios aparecem aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <Card key={n.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-[var(--brand)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {LABELS[n.kind]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ClientShell>
  );
}
