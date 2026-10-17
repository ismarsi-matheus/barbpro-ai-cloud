import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Autorizar integração — BarbeiroPro AI" },
    { name: "description", content: "Revise e autorize o acesso de um agente à sua conta do BarbeiroPro AI." },
    { property: "og:title", content: "Autorizar integração — BarbeiroPro AI" },
    { property: "og:description", content: "Controle o acesso dos agentes aos seus dados do BarbeiroPro AI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Solicitação inválida. Inicie a conexão novamente no seu agente.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Não foi possível verificar sua conta. Tente novamente.");
    if (!data.session) throw redirect({ to: "/cliente/entrar", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Solicitação inválida.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error || !data) throw new Error("Esta solicitação expirou ou não está disponível. Inicie a conexão novamente no seu agente.");
    if ("redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  pendingComponent: () => <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 aria-label="Carregando solicitação" className="h-6 w-6 animate-spin text-primary" /></main>,
  errorComponent: ({ error }) => <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Não foi possível abrir a solicitação</CardTitle></CardHeader><CardContent className="space-y-4"><p role="alert" className="text-sm text-muted-foreground">{error.message}</p><Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button></CardContent></Card></main>,
  component: ConsentPage,
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const clientName = details.client.name || "Agente";
  const scopeLabels: Record<string, string> = { openid: "Identificação da conta", email: "Endereço de e-mail", profile: "Perfil básico" };

  async function decide(approve: boolean) {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const { data, error } = approve
        ? await supabase.auth.oauth.approveAuthorization(authorization_id, { skipBrowserRedirect: true })
        : await supabase.auth.oauth.denyAuthorization(authorization_id, { skipBrowserRedirect: true });
      if (error || !data?.redirect_url) throw new Error("Não foi possível registrar sua escolha. Tente novamente.");
      window.location.assign(data.redirect_url);
    } catch {
      setFailure("Não foi possível registrar sua escolha. Tente novamente.");
      setBusy(false);
    }
  }

  async function switchAccount() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setFailure("Não foi possível sair da conta. Tente novamente."); setBusy(false); return; }
    window.location.assign(`/cliente/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-3"><ShieldCheck className="h-8 w-8 text-primary" /><CardTitle className="break-words">Conectar {clientName} ao BarbeiroPro AI</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div><p className="break-words text-sm font-medium">{details.user.email}</p><Button variant="link" className="h-auto px-0" disabled={busy} onClick={switchAccount}>Usar outra conta</Button></div>
        <p className="text-sm text-muted-foreground">Este agente poderá consultar seus agendamentos, histórico de créditos do Clube e vínculos de equipe. Nenhuma reserva, cobrança ou assinatura será alterada.</p>
        <div className="space-y-2 border-y py-4"><p className="text-sm font-medium">Identificação solicitada</p><ul className="list-inside list-disc text-sm text-muted-foreground">{details.scope.split(/\s+/).filter(Boolean).map((scope) => <li key={scope}>{scopeLabels[scope] ?? `Permissão adicional: ${scope}`}</li>)}</ul><p className="break-all text-xs text-muted-foreground">Destino: {details.redirect_uri}</p></div>
        <p className="text-sm text-muted-foreground">Seu acesso continua limitado às permissões da sua conta.</p>
        {failure ? <p role="alert" className="text-sm text-destructive">{failure}</p> : null}
        <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Permitir acesso</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button></div>
      </CardContent>
    </Card>
  </main>;
}