import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientSession } from "@/hooks/use-client-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, Plus, LogOut, Scissors } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  component: ClienteHome,
});

function ClienteHome() {
  const { session, loading } = useClientSession();
  const navigate = useNavigate();

  const profileQ = useQuery({
    queryKey: ["client-profile", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from("client_profile").select("*").eq("user_id", session!.user.id).maybeSingle();
      return data;
    },
  });

  const nextQ = useQuery({
    queryKey: ["client-next-appt", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_appointments");
      if (error) { console.error(error); return null; }
      const upcoming = (data ?? []).filter((a: any) =>
        new Date(a.scheduled_at) >= new Date() && !["cancelado", "nao_compareceu", "concluido"].includes(a.status)
      ).sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      return upcoming[0] ?? null;
    },
  });

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const nome = profileQ.data?.full_name || session.user.user_metadata?.full_name || session.user.email;
  const next = nextQ.data;

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu");
    navigate({ to: "/cliente/entrar" });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Área do Cliente</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {nome} 👋</h1>
          <p className="text-muted-foreground">Bem-vindo à sua área pessoal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximo agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            {next ? (
              <div className="space-y-1 text-sm">
                <div className="font-medium">{next.service_name} — {next.professional_name}</div>
                <div className="text-muted-foreground">
                  {format(new Date(next.scheduled_at), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </div>
                <div className="text-muted-foreground">{next.company_name}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/cliente/agendamentos" className="block">
            <Card className="hover:shadow-md transition h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Calendar className="w-6 h-6 text-[var(--brand)]" />
                <div className="font-medium">Meus agendamentos</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/cliente/perfil" className="block">
            <Card className="hover:shadow-md transition h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <User className="w-6 h-6 text-[var(--brand)]" />
                <div className="font-medium">Meu perfil</div>
              </CardContent>
            </Card>
          </Link>
          {next?.company_slug ? (
            <Link to="/agendar/$slug" params={{ slug: next.company_slug }} className="block">
              <Card className="hover:shadow-md transition h-full bg-[var(--brand)] text-white">
                <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                  <Plus className="w-6 h-6" />
                  <div className="font-medium">Novo agendamento</div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="h-full opacity-70">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Plus className="w-6 h-6 text-[var(--brand)]" />
                <div className="font-medium">Novo agendamento</div>
                <p className="text-xs text-muted-foreground">Use o link da barbearia</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
