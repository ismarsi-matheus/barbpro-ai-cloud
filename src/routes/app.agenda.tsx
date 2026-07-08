import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Filter, Receipt, Bell, UserX } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/app/agenda")({ component: AgendaPage });

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const COLORS = [
  "bg-blue-100 border-l-blue-500 text-blue-900",
  "bg-emerald-100 border-l-emerald-500 text-emerald-900",
  "bg-purple-100 border-l-purple-500 text-purple-900",
  "bg-amber-100 border-l-amber-500 text-amber-900",
  "bg-rose-100 border-l-rose-500 text-rose-900",
  "bg-cyan-100 border-l-cyan-500 text-cyan-900",
];

function AgendaPage() {
  const { data: company } = useCurrentCompany();
  const cid = company?.id;
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [profFilter, setProfFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const days = Array.from({ length: 7 }).map((_, i) => addDays(anchor, i));

  const { data: pros = [] } = useQuery({
    queryKey: ["pros-list", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data } = await supabase.from("professional").select("id, name").eq("company_id", cid!).eq("active", true);
      return data ?? [];
    },
  });

  const { data: apts = [] } = useQuery({
    queryKey: ["week-apts", cid, anchor.toISOString()],
    enabled: !!cid,
    queryFn: async () => {
      const start = anchor.toISOString();
      const end = addDays(anchor, 7).toISOString();
      const { data } = await supabase.from("appointment").select("*")
        .eq("company_id", cid!).gte("scheduled_at", start).lt("scheduled_at", end)
        .order("scheduled_at");
      return data ?? [];
    },
  });

  const profColor = useMemo(() => {
    const m = new Map<string, string>();
    pros.forEach((p: any, i: number) => m.set(p.id, COLORS[i % COLORS.length]));
    return m;
  }, [pros]);

  const filtered = (apts as any[]).filter((a) => {
    if (profFilter !== "all" && a.professional_id !== profFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        description="Calendário semanal"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/app/lembretes" })}>
              <Bell className="w-4 h-4 mr-1" /> Lembretes
            </Button>
            <Button onClick={() => toast.info("Modal de novo agendamento — em breve")} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
              <Plus className="w-4 h-4 mr-1" /> Novo agendamento
            </Button>
          </div>
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
          <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoje</Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={profFilter} onValueChange={setProfFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {pros.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                const slot = filtered.filter((a) => {
                  const ad = parseISO(a.scheduled_at);
                  return isSameDay(ad, d) && ad.getHours() === h;
                });
                return (
                  <div key={d.toISOString() + h} className="border-r last:border-r-0 border-b min-h-[60px] p-1 space-y-1 hover:bg-muted/20">
                    {slot.map((a) => (
                      <div
                        key={a.id}
                        className={`text-[10px] p-1.5 rounded border-l-2 cursor-pointer ${profColor.get(a.professional_id) ?? "bg-slate-100 border-l-slate-400"}`}
                        title={`${a.customer_name} • ${a.service_name}`}
                        onClick={() => setSelected(a)}
                      >
                        <div className="font-semibold truncate">{format(parseISO(a.scheduled_at), "HH:mm")} {a.customer_name}</div>
                        <div className="truncate opacity-80">{a.service_name}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {pros.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Profissional:</span>
          {pros.map((p: any) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${(profColor.get(p.id) ?? "bg-slate-100").split(" ")[0]}`}></div>
              {p.name}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.customer_name ?? "Agendamento"}</DialogTitle>
            <DialogDescription>
              {selected && format(parseISO(selected.scheduled_at), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p><b>Serviço:</b> {selected.service_name}</p>
              <p><b>Profissional:</b> {selected.professional_name}</p>
              <p><b>Status:</b> {selected.status}</p>
              {selected.price && <p><b>Valor estimado:</b> R$ {Number(selected.price).toFixed(2)}</p>}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            {selected && parseISO(selected.scheduled_at) < new Date() && selected.status !== "concluido" && selected.status !== "nao_compareceu" && (
              <Button
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={async () => {
                  const { error } = await supabase.from("appointment").update({ status: "nao_compareceu" }).eq("id", selected.id);
                  if (error) toast.error(error.message);
                  else { toast.success("Marcado como falta"); setSelected(null); }
                }}
              >
                <UserX className="w-4 h-4 mr-1" /> Marcar falta
              </Button>
            )}
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                if (!selected) return;
                navigate({ to: "/app/comandas", search: { appointment_id: selected.id } });
              }}
            >
              <Receipt className="w-4 h-4 mr-1" /> Abrir comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
