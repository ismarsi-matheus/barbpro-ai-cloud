/**
 * Disponibilidade de horários de um profissional em um dia.
 * Mesma regra do agendamento público (jornada, almoço, bloqueios, ocupados),
 * reutilizada pela Área do Cliente (reagendamento).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export function useAvailability(params: {
  companyId?: string | null;
  professionalId?: string | null;
  date: Date;
  durationMinutes?: number | null;
}) {
  const { companyId, professionalId, date } = params;
  const duration = params.durationMinutes ?? 30;

  const schedQuery = useQuery({
    queryKey: ["availability-sched", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_schedule")
        .select("*")
        .eq("professional_id", professionalId!);
      if (error) return [];
      return data ?? [];
    },
    retry: false,
  });

  const blocksQuery = useQuery({
    queryKey: ["availability-blocks", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_block")
        .select("start_date,end_date")
        .eq("professional_id", professionalId!);
      if (error) return [];
      return data ?? [];
    },
    retry: false,
  });

  const busyQuery = useQuery({
    queryKey: ["availability-busy", companyId, professionalId, format(date, "yyyy-MM-dd")],
    enabled: !!companyId && !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_busy_slots", {
        _company_id: companyId!,
        _professional_id: professionalId!,
        _date: format(date, "yyyy-MM-dd"),
      });
      if (error) return [];
      return (data ?? []) as Array<{ starts_at: string; ends_at: string }>;
    },
    retry: false,
  });

  const loading = schedQuery.isLoading || blocksQuery.isLoading || busyQuery.isLoading;

  const isBlocked = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    return (blocksQuery.data ?? []).some(
      (b: { start_date: string; end_date: string }) => iso >= b.start_date && iso <= b.end_date,
    );
  };

  const daySched = (d: Date) => {
    const list = (schedQuery.data ?? []) as Array<Record<string, unknown>>;
    if (list.length === 0) return null;
    return list.find((s) => s["weekday"] === d.getDay()) ?? null;
  };

  const dayUnavailable = (d: Date) => {
    if (schedQuery.isLoading || blocksQuery.isLoading) return true;
    if (isBlocked(d)) return true;
    const s = daySched(d);
    if (!s) return true;
    return !s["is_working"];
  };

  const slots = useMemo(() => {
    const list: string[] = [];
    if (schedQuery.isLoading || blocksQuery.isLoading || isBlocked(date)) return list;
    const s = daySched(date) as Record<string, string | number | boolean | null> | null;
    if (s && !s["is_working"]) return list;
    const step = (s?.["slot_minutes"] as number) ?? 30;
    const parse = (v: unknown, fallback: string) =>
      String(v ?? fallback)
        .slice(0, 5)
        .split(":")
        .map(Number);
    const [sh, sm] = parse(s?.["start_time"], "09:00");
    const [eh, em] = parse(s?.["end_time"], "19:00");
    const lunchStart = s?.["lunch_start"] ? parse(s["lunch_start"], "00:00") : null;
    const lunchEnd = s?.["lunch_end"] ? parse(s["lunch_end"], "00:00") : null;
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const lStart = lunchStart ? lunchStart[0] * 60 + lunchStart[1] : null;
    const lEnd = lunchEnd ? lunchEnd[0] * 60 + lunchEnd[1] : null;
    for (let m = startMin; m < endMin; m += step) {
      if (lStart != null && lEnd != null && m >= lStart && m < lEnd) continue;
      list.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedQuery.data, blocksQuery.data, schedQuery.isLoading, blocksQuery.isLoading, date]);

  const unavailable = useMemo(() => {
    const set = new Set<string>();
    const busy = busyQuery.data ?? [];
    const now = Date.now();
    for (const t of slots) {
      const [hh, mm] = t.split(":").map(Number);
      const slotStart = startOfDay(date).getTime() + (hh * 60 + mm) * 60_000;
      const slotEnd = slotStart + duration * 60_000;
      if (slotStart <= now) {
        set.add(t);
        continue;
      }
      for (const b of busy) {
        const bStart = new Date(b.starts_at).getTime();
        const bEnd = new Date(b.ends_at).getTime();
        if (slotStart < bEnd && bStart < slotEnd) {
          set.add(t);
          break;
        }
      }
    }
    return set;
  }, [busyQuery.data, slots, date, duration]);

  const days = useMemo(
    () => Array.from({ length: 21 }, (_, i) => addDays(startOfDay(new Date()), i)),
    [],
  );

  return { slots, unavailable, days, dayUnavailable, loading };
}
