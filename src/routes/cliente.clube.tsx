import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Crown,
  Gift,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientShell } from "@/components/client/client-shell";
import {
  useClientDashboard,
  useClientSession,
  useClubUsage,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/clube")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu Clube — BarbeiroPro" },
      { name: "description", content: "Acompanhe sua assinatura, benefícios e histórico de uso." },
      { property: "og:title", content: "Meu Clube — BarbeiroPro" },
      {
        property: "og:description",
        content: "Acompanhe sua assinatura, benefícios e histórico de uso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubePage,
});

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function ClubePage() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const [selected, setSelected] = useState<string>("all");
  const usage = useClubUsage(session?.user.id, selected === "all" ? null : selected);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";
  const memberships = dash.data?.club_memberships ?? [];
  const favSlug = dash.data?.profile?.favorite_company_slug ?? null;

  const entries = useMemo(() => usage.data ?? [], [usage.data]);

  return (
    <ClientShell
      title="Meu Clube"
      subtitle="Assinaturas, benefícios e uso"
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
    >
      {dash.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : memberships.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Gift className="h-10 w-10 text-[var(--brand)]" />
            <div>
              <p className="font-medium">Você ainda não faz parte de um Clube</p>
              <p className="text-sm text-muted-foreground">
                Assinantes têm créditos mensais, descontos e prioridade no atendimento.
              </p>
            </div>
            {favSlug ? (
              <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
                <Link to="/agendar/$slug" params={{ slug: favSlug }} search={{}}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Ver planos ao agendar
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {memberships.map((m) => {
              const ativo = m.status === "ativo";
              const pct =
                m.creditos_mensais > 0 ? (m.creditos_restantes / m.creditos_mensais) * 100 : 0;
              return (
                <Card key={m.id} className={ativo ? "border-[var(--brand)]/40" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Crown className="h-4 w-4 text-[var(--brand)]" /> {m.plano_nome}
                        </CardTitle>
                        <CardDescription>{m.company_name}</CardDescription>
                      </div>
                      <Badge
                        className={
                          ativo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Wallet className="h-3.5 w-3.5" /> Saldo
                        </p>
                        <p className="text-2xl font-bold">{m.creditos_restantes}</p>
                        <p className="text-[11px] text-muted-foreground">
                          de {m.creditos_mensais}/mês
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5" /> Renovação
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {m.current_period_end
                            ? format(new Date(m.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBRL(m.preco_cents)}/mês
                        </p>
                      </div>
                    </div>
                    <Progress value={pct} />
                    {favSlug || m.company_id ? (
                      <p className="text-xs text-muted-foreground">
                        Para alterar ou cancelar seu plano, fale com a barbearia {m.company_name}.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Histórico de benefícios</CardTitle>
                <CardDescription>Cada uso e devolução de crédito</CardDescription>
              </div>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as assinaturas</SelectItem>
                  {memberships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.plano_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {usage.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              ) : entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum benefício utilizado ainda.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {entries.map((e) => {
                    const uso = e.movimento === "uso";
                    return (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-background">
                          {uso ? (
                            <ArrowDownCircle className="h-4 w-4 text-[var(--brand)]" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                          )}
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {uso ? "Benefício utilizado" : "Crédito devolvido"}
                              {e.service_name ? ` • ${e.service_name}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.plano_nome} • {e.company_name} •{" "}
                              {format(new Date(e.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {uso ? "-" : "+"}
                            {e.quantidade}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ClientShell>
  );
}
