import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarPlus,
  Clock,
  CreditCard,
  Crown,
  History,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ClientShell } from "@/components/client/client-shell";
import {
  clubSavings,
  useClientAppointments,
  useClientDashboard,
  useClientSession,
  useSplitAppointments,
} from "@/hooks/use-client-account";
import { googleCalendarUrl, mapsUrl } from "@/lib/client-area/client-links";

export const Route = createFileRoute("/cliente/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área do Cliente — BarbeiroPro" },
      {
        name: "description",
        content: "Acompanhe seus agendamentos, clube de assinatura e histórico na sua barbearia.",
      },
      { property: "og:title", content: "Área do Cliente — BarbeiroPro" },
      {
        property: "og:description",
        content: "Seus horários, benefícios do clube e histórico em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClienteDashboard,
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function dayLabel(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

function ClienteDashboard() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const appointmentsQ = useClientAppointments(session?.user.id);
  const { past } = useSplitAppointments(appointmentsQ.data);
  const economia = clubSavings(appointmentsQ.data);
  const recentes = past.slice(0, 4);

  const data = dash.data;
  const nome =
    data?.profile?.full_name ||
    (session?.user.user_metadata?.["full_name"] as string | undefined) ||
    session?.user.email ||
    "Cliente";
  const primeiroNome = nome.split(" ")[0];
  const next = data?.next_appointment ?? null;
  const clubs = data?.club_memberships ?? [];
  const activeClub = clubs.find((c) => c.status === "ativo") ?? clubs[0] ?? null;
  const favSlug = data?.profile?.favorite_company_slug ?? next?.company_slug ?? null;

  return (
    <ClientShell
      title={`Olá, ${primeiroNome} 👋`}
      subtitle="Este é o resumo da sua conta"
      user={{ name: nome, email: session?.user.email, photo: data?.profile?.photo_url }}
      actions={
        favSlug ? (
          <Button asChild size="sm" className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo agendamento
            </Link>
          </Button>
        ) : null
      }
    >
      {dash.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      ) : dash.isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Não conseguimos carregar seus dados agora.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => dash.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Próximo horário */}
          <Card className="overflow-hidden border-[var(--brand)]/30">
            <div className="bg-[var(--brand)] px-5 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" /> Seu próximo horário
              </p>
            </div>
            <CardContent className="p-5">
              {next ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">{next.service_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      com {next.professional_name} • {next.company_name}
                    </p>
                    <p className="text-base font-medium">
                      {dayLabel(new Date(next.scheduled_at))} às{" "}
                      {format(new Date(next.scheduled_at), "HH:mm")}
                    </p>
                    {next.pagamento_tipo === "clube" ? (
                      <Badge className="mt-1 gap-1 bg-[var(--brand)] text-white">
                        <Crown className="h-3 w-3" /> CLUBE
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={googleCalendarUrl({
                          id: next.id,
                          scheduled_at: next.scheduled_at,
                          service_name: next.service_name,
                          professional_name: next.professional_name,
                          company_name: next.company_name,
                          company_endereco: next.company_endereco,
                        })}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Agenda
                      </a>
                    </Button>
                    {mapsUrl({
                      id: next.id,
                      scheduled_at: next.scheduled_at,
                      company_name: next.company_name,
                      company_endereco: next.company_endereco,
                    }) ? (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={
                            mapsUrl({
                              id: next.id,
                              scheduled_at: next.scheduled_at,
                              company_name: next.company_name,
                              company_endereco: next.company_endereco,
                            })!
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="mr-1.5 h-3.5 w-3.5" /> Como chegar
                        </a>
                      </Button>
                    ) : null}
                    <Button size="sm" asChild>
                      <Link to="/cliente/agendamentos">Gerenciar</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Você não tem nenhum horário marcado.
                  </p>
                  {favSlug ? (
                    <Button asChild className="mt-3">
                      <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
                        Agendar agora
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use o link de agendamento da sua barbearia.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indicadores */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Visitas realizadas</p>
                <p className="text-3xl font-bold">{data?.stats?.visitas ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total investido</p>
                <p className="text-3xl font-bold">{formatBRL(Number(data?.stats?.total_gasto ?? 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total economizado no Clube</p>
                <p className="text-3xl font-bold text-emerald-600">{formatBRL(economia)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Profissional favorito</p>
                <p className="truncate text-lg font-semibold">
                  {data?.profile?.favorite_professional_name ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Últimos serviços */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Últimos serviços</CardTitle>
                <CardDescription>Seus atendimentos mais recentes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cliente/historico">
                  Ver tudo <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Você ainda não tem atendimentos concluídos.
                </p>
              ) : (
                <ul className="divide-y">
                  {recentes.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          to="/cliente/agendamentos/$id"
                          params={{ id: a.id }}
                          className="truncate font-medium hover:underline"
                        >
                          {a.service_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {format(new Date(a.scheduled_at), "dd/MM/yyyy")} • {a.professional_name} •{" "}
                          {a.company_name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {a.pagamento_tipo === "clube" ? (
                          <Badge className="gap-1 bg-[var(--brand)] text-white">
                            <Crown className="h-3 w-3" /> Clube
                          </Badge>
                        ) : (
                          <span className="text-sm font-semibold">
                            {formatBRL(Number(a.price ?? 0))}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>


          {/* Clube */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="h-4 w-4 text-[var(--brand)]" /> Clube de assinatura
                </CardTitle>
                <CardDescription>
                  {activeClub ? activeClub.company_name : "Assine e economize todo mês"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cliente/clube">
                  Ver <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeClub ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{activeClub.plano_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeClub.status === "ativo" ? "Assinatura ativa" : "Assinatura inativa"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wallet className="h-3 w-3" /> Saldo
                      </p>
                      <p className="text-2xl font-bold">{activeClub.creditos_restantes}</p>
                    </div>
                  </div>
                  <Progress
                    value={
                      activeClub.creditos_mensais > 0
                        ? (activeClub.creditos_restantes / activeClub.creditos_mensais) * 100
                        : 0
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {activeClub.creditos_restantes} de {activeClub.creditos_mensais} benefício(s)
                    {activeClub.current_period_end
                      ? ` • renova em ${format(new Date(activeClub.current_period_end), "dd/MM/yyyy")}`
                      : ""}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed p-4">
                  <Sparkles className="h-6 w-6 text-[var(--brand)]" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    Você ainda não é assinante. Consulte os planos ao agendar.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atalhos */}
          <div className="grid gap-3 sm:grid-cols-3">
            {favSlug ? (
              <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
                <Card className="h-full border-[var(--brand)]/40 transition hover:shadow-md">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <Plus className="h-5 w-5 text-[var(--brand)]" />
                    <span className="font-medium">Novo agendamento</span>
                  </CardContent>
                </Card>
              </Link>
            ) : null}
            <Link
              to={next ? "/cliente/agendamentos/$id" : "/cliente/agendamentos"}
              params={next ? { id: next.id } : undefined}
            >
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <CalendarPlus className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Reagendar</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/cliente/agendamentos">
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Clock className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Meus agendamentos</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/cliente/historico">
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <History className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Ver histórico</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/cliente/clube">
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Crown className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Meu Clube</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/cliente/perfil">
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Sparkles className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Editar perfil</span>
                </CardContent>
              </Card>
            </Link>
            <Link to="/cliente/pagamentos">
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 pt-6">
                  <CreditCard className="h-5 w-5 text-[var(--brand)]" />
                  <span className="font-medium">Pagamentos</span>
                </CardContent>
              </Card>
            </Link>
          </div>

          {data?.last_appointment ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3" /> Última visita:{" "}
              {format(new Date(data.last_appointment.scheduled_at), "dd/MM/yyyy")} —{" "}
              {data.last_appointment.service_name} com {data.last_appointment.professional_name}
            </p>
          ) : null}
        </div>
      )}
    </ClientShell>
  );
}
