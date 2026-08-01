import { Link } from "@tanstack/react-router";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarPlus,
  Clock,
  Crown,
  Download,
  MapPin,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Repeat,
  Star,
  User,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ClientAppointment } from "@/hooks/use-client-account";
import {
  downloadIcs,
  downloadReceipt,
  googleCalendarUrl,
  mapsUrl,
  whatsappUrl,
} from "@/lib/client-area/client-links";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

const STATUS_STYLE: Record<string, string> = {
  agendado: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  confirmado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  em_andamento: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  concluido: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  nao_compareceu: "bg-destructive/10 text-destructive border-destructive/20",
};

function dayLabel(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function AppointmentCard({
  appointment,
  clientName,
  variant = "upcoming",
  onCancel,
  onReschedule,
  onReview,
}: {
  appointment: ClientAppointment;
  clientName: string;
  variant?: "upcoming" | "history";
  onCancel?: (a: ClientAppointment) => void;
  onReschedule?: (a: ClientAppointment) => void;
  onReview?: (a: ClientAppointment) => void;
}) {
  const date = new Date(appointment.scheduled_at);
  const maps = mapsUrl(appointment);
  const whats = whatsappUrl(appointment);
  const isClub = appointment.pagamento_tipo === "clube";
  const canManage = variant === "upcoming";

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", STATUS_STYLE[appointment.status])}>
                {STATUS_LABEL[appointment.status] ?? appointment.status}
              </Badge>
              {isClub ? (
                <Badge className="gap-1 bg-[var(--brand)] text-white">
                  <Crown className="h-3 w-3" /> CLUBE
                </Badge>
              ) : null}
              {appointment.rating ? (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {appointment.rating}
                </span>
              ) : null}
            </div>
            <h3 className="truncate text-base font-semibold">{appointment.service_name}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" /> {appointment.professional_name}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {dayLabel(date)} às {format(date, "HH:mm")}
            </p>
            <p className="truncate text-sm text-muted-foreground">{appointment.company_name}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-lg font-semibold">
                {isClub
                  ? "Clube"
                  : appointment.price != null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(appointment.price))
                    : "—"}
              </div>
              {appointment.duration_minutes ? (
                <div className="text-xs text-muted-foreground">
                  {appointment.duration_minutes} min
                </div>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canManage ? (
                  <>
                    <DropdownMenuItem onClick={() => onReschedule?.(appointment)}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reagendar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onCancel?.(appointment)}
                    >
                      <X className="mr-2 h-4 w-4" /> Cancelar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href={googleCalendarUrl(appointment)} target="_blank" rel="noreferrer">
                        <CalendarPlus className="mr-2 h-4 w-4" /> Google Agenda
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadIcs(appointment)}>
                      <CalendarPlus className="mr-2 h-4 w-4" /> Apple / Outlook (.ics)
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onReview?.(appointment)}>
                      <Star className="mr-2 h-4 w-4" />{" "}
                      {appointment.rating ? "Editar avaliação" : "Avaliar atendimento"}
                    </DropdownMenuItem>
                    {appointment.company_slug ? (
                      <DropdownMenuItem asChild>
                        <Link
                          to="/agendar/$slug"
                          params={{ slug: appointment.company_slug }}
                          search={{
                            servico: appointment.service_id ?? undefined,
                            profissional: appointment.professional_id ?? undefined,
                          }}
                        >
                          <Repeat className="mr-2 h-4 w-4" /> Agendar novamente
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                  </>
                )}
                <DropdownMenuSeparator />
                {maps ? (
                  <DropdownMenuItem asChild>
                    <a href={maps} target="_blank" rel="noreferrer">
                      <MapPin className="mr-2 h-4 w-4" /> Como chegar
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {whats ? (
                  <DropdownMenuItem asChild>
                    <a href={whats} target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> Falar com a barbearia
                    </a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => downloadReceipt(appointment, clientName)}>
                  <Download className="mr-2 h-4 w-4" /> Baixar comprovante
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onReschedule?.(appointment)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reagendar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={googleCalendarUrl(appointment)} target="_blank" rel="noreferrer">
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Agenda
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onCancel?.(appointment)}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
