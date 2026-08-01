import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Crown,
  Download,
  MapPin,
  MessageCircle,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { ClientShell } from "@/components/client/client-shell";
import { RescheduleDialog } from "@/components/client/reschedule-dialog";
import { ReviewDialog } from "@/components/client/review-dialog";
import {
  useCancelAppointment,
  useClientAppointments,
  useClientDashboard,
  useClientSession,
  type ClientAppointment,
} from "@/hooks/use-client-account";
import { downloadReceipt, mapsUrl, whatsappUrl } from "@/lib/client-area/client-links";

export const Route = createFileRoute("/cliente/agendamentos/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Detalhes do agendamento — BarbeiroPro" },
      { name: "description", content: "Veja a linha do tempo e os detalhes do seu atendimento." },
      { property: "og:title", content: "Detalhes do agendamento — BarbeiroPro" },
      {
        property: "og:description",
        content: "Veja a linha do tempo e os detalhes do seu atendimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppointmentDetailPage,
});

const STEPS = [
  { key: "agendado", label: "Agendado" },
  { key: "confirmado", label: "Confirmado" },
  { key: "em_andamento", label: "Em atendimento" },
  { key: "concluido", label: "Finalizado" },
  { key: "avaliado", label: "Avaliado" },
] as const;

function stepIndex(a: ClientAppointment) {
  if (a.rating) return 4;
  if (a.status === "concluido") return 3;
  if (a.status === "em_andamento") return 2;
  if (a.status === "confirmado") return 1;
  return 0;
}

function Timeline({ appointment }: { appointment: ClientAppointment }) {
  const canceled = appointment.status === "cancelado" || appointment.status === "nao_compareceu";
  const current = stepIndex(appointment);

  if (canceled) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          {appointment.status === "cancelado" ? "Agendamento cancelado" : "Não compareceu"}
        </p>
        <p className="text-muted-foreground">
          Criado em{" "}
          {appointment.created_at
            ? format(new Date(appointment.created_at), "dd/MM/yyyy 'às' HH:mm")
            : "—"}
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                done
                  ? "border-transparent bg-[var(--brand)] text-white"
                  : "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>
                {s.label}
              </p>
              {s.key === "agendado" && appointment.created_at ? (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(appointment.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              ) : null}
              {s.key === "confirmado" && appointment.confirmed_at ? (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(appointment.confirmed_at), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              ) : null}
              {s.key === "concluido" && appointment.completed_at ? (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(appointment.completed_at), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AppointmentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useClientSession();
  const appointmentsQ = useClientAppointments(session?.user.id);
  const dash = useClientDashboard(session?.user.id);
  const cancelMutation = useCancelAppointment();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [review, setReview] = useState(false);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";
  const appointment = (appointmentsQ.data ?? []).find((a) => a.id === id) ?? null;

  const doCancel = async () => {
    if (!appointment) return;
    try {
      await cancelMutation.mutateAsync(appointment.id);
      toast.success("Agendamento cancelado.");
      navigate({ to: "/cliente/agendamentos" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setConfirmCancel(false);
    }
  };

  const upcoming =
    !!appointment &&
    new Date(appointment.scheduled_at).getTime() > Date.now() &&
    !["cancelado", "concluido", "nao_compareceu"].includes(appointment.status);

  return (
    <ClientShell
      title="Detalhes do agendamento"
      subtitle={appointment?.company_name ?? undefined}
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/cliente/agendamentos">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      {appointmentsQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      ) : !appointment ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="font-medium">Agendamento não encontrado</p>
            <p className="text-sm text-muted-foreground">
              Ele pode ter sido removido ou pertence a outra conta.
            </p>
            <Button asChild className="mt-4">
              <Link to="/cliente/agendamentos">Ver meus agendamentos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-xl font-semibold">{appointment.service_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(appointment.scheduled_at), "EEEE, dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline">{appointment.status}</Badge>
                      {appointment.pagamento_tipo === "clube" ? (
                        <Badge className="gap-1 bg-[var(--brand)] text-white">
                          <Crown className="h-3 w-3" /> Benefício do Clube
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold">
                      {appointment.pagamento_tipo === "clube"
                        ? formatBRL(0)
                        : formatBRL(appointment.price)}
                    </p>
                    {appointment.pagamento_tipo === "clube" && appointment.service_price ? (
                      <p className="text-xs text-emerald-600">
                        economia de {formatBRL(appointment.service_price)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={appointment.professional_photo ?? undefined} />
                    <AvatarFallback>
                      {appointment.professional_name?.slice(0, 2).toUpperCase() ?? "PR"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{appointment.professional_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.duration_minutes ?? 30} min • {appointment.company_name}
                    </p>
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">Forma de pagamento</dt>
                    <dd className="text-sm font-medium capitalize">
                      {appointment.pagamento_tipo}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">Preço de tabela</dt>
                    <dd className="text-sm font-medium">{formatBRL(appointment.service_price)}</dd>
                  </div>
                  <div className="rounded-lg border p-3 sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Observações</dt>
                    <dd className="text-sm">{appointment.notes || "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Linha do tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline appointment={appointment} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming ? (
                <>
                  <Button className="w-full" variant="outline" onClick={() => setReschedule(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reagendar
                  </Button>
                  <Button
                    className="w-full text-destructive hover:text-destructive"
                    variant="outline"
                    onClick={() => setConfirmCancel(true)}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                </>
              ) : null}
              {appointment.status === "concluido" ? (
                <Button className="w-full" variant="outline" onClick={() => setReview(true)}>
                  <Star className="mr-2 h-4 w-4" />
                  {appointment.rating ? "Editar avaliação" : "Avaliar atendimento"}
                </Button>
              ) : null}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => downloadReceipt(appointment, nome)}
              >
                <Download className="mr-2 h-4 w-4" /> Baixar comprovante
              </Button>
              {mapsUrl(appointment) ? (
                <Button className="w-full" variant="outline" asChild>
                  <a href={mapsUrl(appointment)!} target="_blank" rel="noreferrer">
                    <MapPin className="mr-2 h-4 w-4" /> Como chegar
                  </a>
                </Button>
              ) : null}
              {whatsappUrl(appointment) ? (
                <Button className="w-full" variant="outline" asChild>
                  <a href={whatsappUrl(appointment)!} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Falar com a barbearia
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <RescheduleDialog
        appointment={reschedule ? appointment : null}
        open={reschedule}
        onOpenChange={setReschedule}
      />
      <ReviewDialog
        appointment={review ? appointment : null}
        userId={session?.user.id ?? ""}
        open={review}
        onOpenChange={setReview}
      />

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se o horário usou um benefício do Clube, o crédito volta para o seu saldo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={doCancel}
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
