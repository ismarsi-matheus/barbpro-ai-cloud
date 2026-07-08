import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { demoAppointments, demoProfessionals } from "@/lib/demo-data";
import { toast } from "sonner";

export const Route = createFileRoute("/demo/agenda")({ component: DemoAgenda });

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h - 19h
const PROF_COLORS: Record<string, string> = {
  p1: "bg-blue-100 border-l-blue-500 text-blue-900",
  p2: "bg-emerald-100 border-l-emerald-500 text-emerald-900",
  p3: "bg-purple-100 border-l-purple-500 text-purple-900",
  p4: "bg-amber-100 border-l-amber-500 text-amber-900",
  p5: "bg-rose-100 border-l-rose-500 text-rose-900",
};

function DemoAgenda() {
  const [anchor, setAnchor] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [profFilter, setProfFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const days = Array.from({ length: 7 }).map((_, i) => addDays(anchor, i));

  const filtered = useMemo(() => demoAppointments.filter((a) => {
    if (profFilter !== "all" && a.professional_id !== profFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  }), [profFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        description="Calendário semanal — drag-and-drop pra reagendar"
        action={
          <Button onClick={() => toast.info("Modal de novo agendamento (demo)")} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo agendamento
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {format(anchor, "dd MMM", { locale: ptBR })} — {format(addDays(anchor, 6), "dd MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoje
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={profFilter} onValueChange={setProfFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {demoProfessionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="em_atendimento">Em atendimento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] text-xs">
          <div className="bg-muted/40 p-2 border-b border-r"></div>
          {days.map((d) => (
            <div key={d.toISOString()} className={`p-2 text-center border-b border-r last:border-r-0 bg-muted/40 ${isSameDay(d, new Date()) ? "bg-[var(--brand)]/10" : ""}`}>
              <div className="uppercase text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</div>
              <div className="font-semibold">{format(d, "dd/MM")}</div>
            </div>
          ))}

          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="p-2 text-right text-muted-foreground border-r border-b">{String(h).padStart(2, "0")}:00</div>
              {days.map((d) => {
                const slotApts = filtered.filter((a) => {
                  const ad = parseISO(a.scheduled_at);
                  return isSameDay(ad, d) && ad.getHours() === h;
                });
                return (
                  <div key={d.toISOString() + h} className="border-r last:border-r-0 border-b min-h-[60px] p-1 space-y-1 hover:bg-muted/20">
                    {slotApts.map((a) => {
                      const color = PROF_COLORS[a.professional_id] ?? "bg-slate-100 border-l-slate-400";
                      return (
                        <div
                          key={a.id}
                          className={`text-[10px] p-1.5 rounded border-l-2 ${color} cursor-grab`}
                          title={`${a.customer_name} • ${a.service_name}`}
                          onClick={() => toast.info(`${a.customer_name} • ${a.service_name} • ${a.professional_name}`)}
                        >
                          <div className="font-semibold truncate">{format(parseISO(a.scheduled_at), "HH:mm")} {a.customer_name}</div>
                          <div className="truncate opacity-80">{a.service_name}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Profissional:</span>
        {demoProfessionals.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${PROF_COLORS[p.id].split(" ")[0]}`}></div>
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
