import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { demoCustomers, demoAppointments } from "@/lib/demo-data";
import { Crown, Repeat, Sparkle, Eye } from "lucide-react";

export const Route = createFileRoute("/demo/clientes")({ component: DemoClientes });

const TAG_ICON: Record<string, any> = { vip: Crown, recorrente: Repeat, novo: Sparkle };
const TAG_COLOR: Record<string, string> = {
  vip: "bg-amber-100 text-amber-800",
  recorrente: "bg-emerald-100 text-emerald-800",
  novo: "bg-sky-100 text-sky-800",
};

function DemoClientes() {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<typeof demoCustomers[number] | null>(null);

  const filtered = filter === "all"
    ? demoCustomers
    : demoCustomers.filter((c) => c.tags.includes(filter));

  const timeline = open
    ? demoAppointments.filter((a) => a.customer_id === open.id).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
    : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" description="Cadastro e histórico" />

      <div className="flex flex-wrap items-center gap-2">
        {["all", "vip", "recorrente", "novo"].map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filter === t ? "default" : "outline"}
            onClick={() => setFilter(t)}
            className={filter === t ? "bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" : ""}
          >
            {t === "all" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-2 text-xs opacity-70">
              {t === "all" ? demoCustomers.length : demoCustomers.filter((c) => c.tags.includes(t)).length}
            </span>
          </Button>
        ))}
      </div>

      <DataTable
        data={filtered}
        searchableKeys={["name", "phone", "email"]}
        columns={[
          { key: "name", header: "Nome" },
          { key: "phone", header: "Telefone" },
          {
            key: "tags", header: "Tags",
            render: (r) => (
              <div className="flex gap-1">
                {r.tags.map((t: string) => {
                  const Icon = TAG_ICON[t];
                  return (
                    <Badge key={t} className={`${TAG_COLOR[t]} border-0 text-[10px]`}>
                      {Icon && <Icon className="w-3 h-3 mr-1" />}{t}
                    </Badge>
                  );
                })}
              </div>
            ),
          },
          { key: "total_appointments", header: "Atend." },
          { key: "favorite_service", header: "Serviço favorito" },
          { key: "last_appointment_at", header: "Último", render: (r) => format(parseISO(r.last_appointment_at), "dd/MM/yyyy") },
          {
            key: "actions", header: "",
            render: (r) => <Button size="icon" variant="ghost" onClick={() => setOpen(r)}><Eye className="w-4 h-4" /></Button>,
            className: "text-right",
          },
        ]}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{open?.name}</DialogTitle>
            <DialogDescription>{open?.phone} • {open?.email}</DialogDescription>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Atendimentos</p>
                  <p className="font-semibold">{open.total_appointments}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Profissional</p>
                  <p className="font-semibold text-xs">{open.favorite_professional}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Serviço favorito</p>
                  <p className="font-semibold text-xs">{open.favorite_service}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Timeline de atendimentos</h4>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {timeline.length === 0 && <p className="text-sm text-muted-foreground">Sem registros.</p>}
                  {timeline.map((a) => (
                    <div key={a.id} className="flex justify-between p-2 rounded border text-sm">
                      <div>
                        <div className="font-medium">{a.service_name}</div>
                        <div className="text-xs text-muted-foreground">{a.professional_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">{format(parseISO(a.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                        <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
