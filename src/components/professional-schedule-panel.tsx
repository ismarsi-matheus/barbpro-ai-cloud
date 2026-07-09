import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Trash2, Plus, CalendarOff } from "lucide-react";
import { toast } from "sonner";

const WEEKDAYS = [
  { v: 0, l: "Domingo" },
  { v: 1, l: "Segunda" },
  { v: 2, l: "Terça" },
  { v: 3, l: "Quarta" },
  { v: 4, l: "Quinta" },
  { v: 5, l: "Sexta" },
  { v: 6, l: "Sábado" },
];

const REASONS = [
  "ferias", "folga", "curso", "licenca", "atendimento_externo", "indisponivel",
];
const REASON_LABEL: Record<string, string> = {
  ferias: "Férias", folga: "Folga", curso: "Curso", licenca: "Licença",
  atendimento_externo: "Atendimento externo", indisponivel: "Indisponível",
};

type SchedRow = {
  weekday: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  slot_minutes: number;
};

const defaultRow = (wd: number): SchedRow => ({
  weekday: wd,
  is_working: wd >= 1 && wd <= 6,
  start_time: "09:00",
  end_time: "19:00",
  lunch_start: "",
  lunch_end: "",
  slot_minutes: 30,
});

export function ProfessionalSchedulePanel({ cid, professional }: { cid: string; professional: any }) {
  const qc = useQueryClient();
  const pid = professional.id;

  const { data: existing = [] } = useQuery({
    queryKey: ["prof_sched", pid],
    queryFn: async () => (await supabase.from("professional_schedule").select("*").eq("professional_id", pid)).data ?? [],
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["prof_blocks", pid],
    queryFn: async () => (await supabase.from("professional_block").select("*").eq("professional_id", pid).order("start_date", { ascending: false })).data ?? [],
  });

  const [rows, setRows] = useState<SchedRow[]>(WEEKDAYS.map((w) => defaultRow(w.v)));

  useEffect(() => {
    const map: Record<number, any> = {};
    (existing as any[]).forEach((r) => { map[r.weekday] = r; });
    setRows(WEEKDAYS.map((w) => {
      const r = map[w.v];
      if (!r) return defaultRow(w.v);
      return {
        weekday: w.v,
        is_working: !!r.is_working,
        start_time: (r.start_time ?? "09:00").slice(0, 5),
        end_time: (r.end_time ?? "19:00").slice(0, 5),
        lunch_start: r.lunch_start ? r.lunch_start.slice(0, 5) : "",
        lunch_end: r.lunch_end ? r.lunch_end.slice(0, 5) : "",
        slot_minutes: r.slot_minutes ?? 30,
      };
    }));
  }, [existing.length]);

  const saveSched = useMutation({
    mutationFn: async () => {
      const payload = rows.map((r) => ({
        company_id: cid,
        professional_id: pid,
        weekday: r.weekday,
        is_working: r.is_working,
        start_time: r.start_time || null,
        end_time: r.end_time || null,
        lunch_start: r.lunch_start || null,
        lunch_end: r.lunch_end || null,
        slot_minutes: r.slot_minutes || 30,
      }));
      const { error } = await supabase.from("professional_schedule").upsert(payload, {
        onConflict: "professional_id,weekday",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prof_sched", pid] }); toast.success("Agenda salva"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [bStart, setBStart] = useState("");
  const [bEnd, setBEnd] = useState("");
  const [bReason, setBReason] = useState("indisponivel");
  const [bNote, setBNote] = useState("");

  const addBlock = useMutation({
    mutationFn: async () => {
      if (!bStart || !bEnd) throw new Error("Informe as datas");
      const { error } = await supabase.from("professional_block").insert({
        company_id: cid, professional_id: pid,
        start_date: bStart, end_date: bEnd, reason: bReason, note: bNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prof_blocks", pid] });
      setBStart(""); setBEnd(""); setBReason("indisponivel"); setBNote("");
      toast.success("Bloqueio criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professional_block").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prof_blocks", pid] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const activeBlocks = (blocks as any[]).filter((b) => b.end_date >= today);
  const pastBlocks = (blocks as any[]).filter((b) => b.end_date < today);

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Configurar agenda — {professional.name}</SheetTitle>
        <SheetDescription>Dias de trabalho, horários e bloqueios.</SheetDescription>
      </SheetHeader>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Dias e horários</h3>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.weekday} className="flex flex-wrap items-center gap-2 p-2 border rounded-md">
              <div className="w-20 text-sm font-medium">{WEEKDAYS[i].l}</div>
              <Switch checked={r.is_working} onCheckedChange={(v) => {
                const copy = [...rows]; copy[i] = { ...r, is_working: v }; setRows(copy);
              }} />
              <Input type="time" className="w-24 h-8" value={r.start_time} disabled={!r.is_working}
                onChange={(e) => { const c = [...rows]; c[i] = { ...r, start_time: e.target.value }; setRows(c); }} />
              <span className="text-xs">–</span>
              <Input type="time" className="w-24 h-8" value={r.end_time} disabled={!r.is_working}
                onChange={(e) => { const c = [...rows]; c[i] = { ...r, end_time: e.target.value }; setRows(c); }} />
              <span className="text-xs text-muted-foreground ml-2">Almoço</span>
              <Input type="time" className="w-24 h-8" value={r.lunch_start} disabled={!r.is_working}
                onChange={(e) => { const c = [...rows]; c[i] = { ...r, lunch_start: e.target.value }; setRows(c); }} />
              <span className="text-xs">–</span>
              <Input type="time" className="w-24 h-8" value={r.lunch_end} disabled={!r.is_working}
                onChange={(e) => { const c = [...rows]; c[i] = { ...r, lunch_end: e.target.value }; setRows(c); }} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Duração do slot (min)</Label>
          <Input type="number" className="w-20 h-8" min={5} max={240}
            value={rows[0]?.slot_minutes ?? 30}
            onChange={(e) => setRows(rows.map((r) => ({ ...r, slot_minutes: parseInt(e.target.value) || 30 })))} />
          <Button onClick={() => saveSched.mutate()} disabled={saveSched.isPending}
            className="ml-auto bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            {saveSched.isPending ? "Salvando…" : "Salvar agenda"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarOff className="w-4 h-4" /> Bloqueios</h3>
        <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
          <div><Label className="text-xs">Data inicial</Label><Input type="date" value={bStart} onChange={(e) => setBStart(e.target.value)} /></div>
          <div><Label className="text-xs">Data final</Label><Input type="date" value={bEnd} onChange={(e) => setBEnd(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Motivo</Label>
            <Select value={bReason} onValueChange={setBReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{REASON_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Observação</Label><Input value={bNote} onChange={(e) => setBNote(e.target.value)} /></div>
          <div className="col-span-2 flex justify-end">
            <Button onClick={() => addBlock.mutate()} disabled={addBlock.isPending} size="sm"
              className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
              <Plus className="w-4 h-4 mr-1" /> Adicionar bloqueio
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Ativos / futuros</p>
          {activeBlocks.length === 0 && <p className="text-xs text-muted-foreground">Nenhum bloqueio.</p>}
          {activeBlocks.map((b) => (
            <div key={b.id} className="flex items-center gap-2 p-2 border rounded-md">
              <div className="flex-1 text-sm">
                <span className="font-medium">{REASON_LABEL[b.reason] ?? b.reason}</span>
                <span className="text-muted-foreground"> · {b.start_date} → {b.end_date}</span>
                {b.note && <div className="text-xs text-muted-foreground">{b.note}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) removeBlock.mutate(b.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {pastBlocks.length > 0 && (
          <details>
            <summary className="text-xs uppercase text-muted-foreground cursor-pointer">Histórico ({pastBlocks.length})</summary>
            <div className="space-y-1 mt-2">
              {pastBlocks.map((b) => (
                <div key={b.id} className="text-xs text-muted-foreground p-2 border rounded-md">
                  {REASON_LABEL[b.reason] ?? b.reason} · {b.start_date} → {b.end_date}
                  {b.note && <> · {b.note}</>}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
