import { useState } from "react";
import { addMinutes, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAvailability } from "@/hooks/use-availability";
import { useRescheduleAppointment, type ClientAppointment } from "@/hooks/use-client-account";

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: ClientAppointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const reschedule = useRescheduleAppointment();

  const { slots, unavailable, days, dayUnavailable, loading } = useAvailability({
    companyId: appointment?.company_id,
    professionalId: appointment?.professional_id,
    date,
    durationMinutes: appointment?.duration_minutes,
  });

  if (!appointment) return null;

  const confirm = async () => {
    if (!time) return toast.error("Escolha um novo horário.");
    const [hh, mm] = time.split(":").map(Number);
    const newAt = addMinutes(startOfDay(date), hh * 60 + mm);
    try {
      await reschedule.mutateAsync({ appointmentId: appointment.id, newAt });
      toast.success("Agendamento remarcado!");
      onOpenChange(false);
      setTime(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remarcar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reagendar horário</DialogTitle>
          <DialogDescription>
            {appointment.service_name} com {appointment.professional_name} —{" "}
            {appointment.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Escolha o dia</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const disabled = dayUnavailable(d);
                const active = isSameDay(d, date);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                    }}
                    className={cn(
                      "min-w-[68px] rounded-xl border px-3 py-2 text-center transition",
                      active && "border-[var(--brand)] bg-[var(--brand)] text-white",
                      disabled && "cursor-not-allowed opacity-40",
                      !active && !disabled && "hover:border-[var(--brand)]",
                    )}
                  >
                    <div className="text-[11px] uppercase">
                      {format(d, "EEE", { locale: ptBR })}
                    </div>
                    <div className="text-lg font-semibold leading-none">{format(d, "dd")}</div>
                    <div className="text-[11px]">{format(d, "MMM", { locale: ptBR })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Escolha o horário</p>
            {loading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum horário disponível neste dia. Escolha outra data.
              </p>
            ) : (
              <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto">
                {slots.map((t) => {
                  const off = unavailable.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={off}
                      onClick={() => setTime(t)}
                      className={cn(
                        "rounded-lg border py-2 text-sm transition",
                        time === t && "border-[var(--brand)] bg-[var(--brand)] text-white",
                        off && "cursor-not-allowed line-through opacity-40",
                        time !== t && !off && "hover:border-[var(--brand)]",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!time || reschedule.isPending}>
            {reschedule.isPending ? "Remarcando…" : "Confirmar novo horário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
