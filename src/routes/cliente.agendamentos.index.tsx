import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarX2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClientShell } from "@/components/client/client-shell";
import { AppointmentCard } from "@/components/client/appointment-card";
import { RescheduleDialog } from "@/components/client/reschedule-dialog";
import {
  useCancelAppointment,
  useClientAppointments,
  useClientDashboard,
  useClientSession,
  useSplitAppointments,
  type ClientAppointment,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/agendamentos/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus agendamentos — BarbeiroPro" },
      { name: "description", content: "Gerencie, reagende ou cancele seus horários." },
      { property: "og:title", content: "Meus agendamentos — BarbeiroPro" },
      { property: "og:description", content: "Gerencie, reagende ou cancele seus horários." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgendamentosPage,
});

function AgendamentosPage() {
  const { session } = useClientSession();
  const appointmentsQ = useClientAppointments(session?.user.id);
  const dash = useClientDashboard(session?.user.id);
  const { upcoming } = useSplitAppointments(appointmentsQ.data);
  const cancelMutation = useCancelAppointment();

  const [toCancel, setToCancel] = useState<ClientAppointment | null>(null);
  const [toReschedule, setToReschedule] = useState<ClientAppointment | null>(null);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";
  const favSlug = dash.data?.profile?.favorite_company_slug ?? upcoming[0]?.company_slug ?? null;

  const confirmCancel = async () => {
    if (!toCancel) return;
    try {
      await cancelMutation.mutateAsync(toCancel.id);
      toast.success("Agendamento cancelado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setToCancel(null);
    }
  };

  return (
    <ClientShell
      title="Meus agendamentos"
      subtitle="Seus próximos horários"
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
      actions={
        favSlug ? (
          <Button asChild size="sm">
            <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo
            </Link>
          </Button>
        ) : null
      }
    >
      {appointmentsQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : upcoming.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CalendarX2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum agendamento futuro</p>
              <p className="text-sm text-muted-foreground">
                Quando você marcar um horário, ele aparece aqui.
              </p>
            </div>
            {favSlug ? (
              <Button asChild>
                <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
                  Agendar agora
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              clientName={nome}
              variant="upcoming"
              onCancel={setToCancel}
              onReschedule={setToReschedule}
            />
          ))}
        </div>
      )}

      <RescheduleDialog
        appointment={toReschedule}
        open={!!toReschedule}
        onOpenChange={(v) => !v && setToReschedule(null)}
      />

      <AlertDialog open={!!toCancel} onOpenChange={(v) => !v && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se o horário usou um benefício do Clube, o crédito
              será devolvido automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientShell>
  );
}
