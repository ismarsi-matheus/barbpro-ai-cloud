import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { History, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientShell } from "@/components/client/client-shell";
import { AppointmentCard } from "@/components/client/appointment-card";
import { ReviewDialog } from "@/components/client/review-dialog";
import {
  useClientAppointments,
  useClientDashboard,
  useClientSession,
  useSplitAppointments,
  type ClientAppointment,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/historico")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Histórico de atendimentos — BarbeiroPro" },
      { name: "description", content: "Consulte atendimentos anteriores e avalie sua experiência." },
      { property: "og:title", content: "Histórico de atendimentos — BarbeiroPro" },
      {
        property: "og:description",
        content: "Consulte atendimentos anteriores e avalie sua experiência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { session } = useClientSession();
  const appointmentsQ = useClientAppointments(session?.user.id);
  const dash = useClientDashboard(session?.user.id);
  const { past } = useSplitAppointments(appointmentsQ.data);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("todos");
  const [company, setCompany] = useState("todas");
  const [review, setReview] = useState<ClientAppointment | null>(null);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    past.forEach((a) => map.set(a.company_id, a.company_name ?? "Barbearia"));
    return [...map.entries()];
  }, [past]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    return past.filter((a) => {
      if (status !== "todos" && a.status !== status) return false;
      if (company !== "todas" && a.company_id !== company) return false;
      if (!t) return true;
      return [a.service_name, a.professional_name, a.company_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(t));
    });
  }, [past, term, status, company]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ClientAppointment[]>();
    filtered.forEach((a) => {
      const key = format(new Date(a.scheduled_at), "yyyy-MM");
      groups.set(key, [...(groups.get(key) ?? []), a]);
    });
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <ClientShell
      title="Histórico"
      subtitle={`${past.length} atendimento(s) registrados`}
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por serviço, profissional ou barbearia"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
            <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger>
            <SelectValue placeholder="Barbearia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as barbearias</SelectItem>
            {companies.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {appointmentsQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum atendimento encontrado</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou faça um agendamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([month, items]) => (
            <section key={month} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {format(new Date(`${month}-01T12:00:00`), "MMMM 'de' yyyy")}
              </h2>
              {items.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  clientName={nome}
                  variant="history"
                  onReview={setReview}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <ReviewDialog
        appointment={review}
        userId={session?.user.id ?? ""}
        open={!!review}
        onOpenChange={(v) => !v && setReview(null)}
      />
    </ClientShell>
  );
}
