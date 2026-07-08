import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, ShieldCheck, Webhook, X, Plus, Copy } from "lucide-react";
import { setAppBrand, setSuperAdminEmails } from "@/lib/master.functions";
import { getBillingWebhookInfo, regenerateWebhookToken, listBillingEvents } from "@/lib/billing.functions";

export const Route = createFileRoute("/master/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const qc = useQueryClient();
  const saveBrand = useServerFn(setAppBrand);
  const saveEmails = useServerFn(setSuperAdminEmails);

  const { data: cfg } = useQuery({
    queryKey: ["app_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("app_name, super_admin_emails, system_settings")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [appName, setAppName] = useState("");
  const [color, setColor] = useState("#1B3A4B");
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setAppName(cfg.app_name ?? "BarbeiroPro AI");
    const c = (cfg.system_settings as any)?.primary_color;
    setColor(c || "#1B3A4B");
    setEmails(cfg.super_admin_emails ?? []);
  }, [cfg]);

  const handleSaveBrand = async () => {
    setSavingBrand(true);
    try {
      await saveBrand({ data: { app_name: appName, primary_color: color } });
      qc.invalidateQueries({ queryKey: ["app_config"] });
      toast.success("Marca atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSavingBrand(false);
    }
  };

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes("@")) return toast.error("Email inválido");
    if (emails.includes(e)) return toast.error("Email já está na lista");
    setEmails([...emails, e]);
    setNewEmail("");
  };

  const removeEmail = (e: string) => setEmails(emails.filter((x) => x !== e));

  const handleSaveEmails = async () => {
    setSavingEmails(true);
    try {
      const res = await saveEmails({ data: { emails } });
      qc.invalidateQueries({ queryKey: ["app_config"] });
      toast.success(`Lista salva. ${res.promoted.length} usuário(s) promovido(s) imediatamente.`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSavingEmails(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Marca, super admins e integrações de cobrança" />

      {/* Marca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color }} />
            Marca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div>
            <Label>Nome do aplicativo</Label>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div>
            <Label>Cor primária padrão</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-[160px] font-mono" />
            </div>
          </div>
          <Button
            onClick={handleSaveBrand}
            disabled={savingBrand}
            className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
          >
            {savingBrand ? "Salvando…" : "Salvar marca"}
          </Button>
        </CardContent>
      </Card>

      {/* Super admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Super admins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Emails autorizados a acessar o painel master. Ao adicionar um email que já tem conta, o usuário é
            promovido automaticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            {emails.length === 0 && <span className="text-xs text-muted-foreground">Nenhum email cadastrado.</span>}
            {emails.map((e) => (
              <Badge key={e} variant="secondary" className="gap-1 pr-1 text-xs">
                {e}
                <button
                  onClick={() => removeEmail(e)}
                  className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                  aria-label="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <Input
              type="email"
              placeholder="novo@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            />
            <Button variant="outline" onClick={addEmail}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
          <Button
            onClick={handleSaveEmails}
            disabled={savingEmails}
            className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
          >
            {savingEmails ? "Salvando…" : "Salvar lista"}
          </Button>
        </CardContent>
      </Card>

      <WebhooksSection />
    </div>
  );
}

function WebhooksSection() {
  const qc = useQueryClient();
  const getInfo = useServerFn(getBillingWebhookInfo);
  const regen = useServerFn(regenerateWebhookToken);
  const listEvents = useServerFn(listBillingEvents);

  const { data: info } = useQuery({
    queryKey: ["billing-webhook-info"],
    queryFn: () => getInfo(),
  });
  const { data: ev } = useQuery({
    queryKey: ["billing-events"],
    queryFn: () => listEvents(),
    refetchInterval: 10000,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = info?.baseUrl?.trim() ? info.baseUrl : origin;
  const providers: { key: "kiwify" | "cakto" | "perfectpay" | "hotmart" | "kirvano"; label: string }[] = [
    { key: "kiwify", label: "Kiwify" },
    { key: "cakto", label: "Cakto" },
    { key: "perfectpay", label: "Perfectpay" },
    { key: "hotmart", label: "Hotmart" },
    { key: "kirvano", label: "Kirvano" },
  ];

  const buildUrl = (provider: string, token: string) =>
    `${baseUrl}/api/public/billing/webhook?provider=${provider}&token=${token}`;

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("URL copiada");
  };

  const handleRegen = async (provider: any) => {
    try {
      await regen({ data: { provider } });
      qc.invalidateQueries({ queryKey: ["billing-webhook-info"] });
      toast.success("Token regenerado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-600" />
            Webhooks de cobrança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cole a URL correspondente no painel do provedor de checkout. O token autentica as chamadas — se vazar,
            regenere.
          </p>
          {providers.map((p) => {
            const token = info?.tokens?.[p.key] ?? "";
            const url = buildUrl(p.key, token);
            return (
              <div key={p.key} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.label}</span>
                  <Button size="sm" variant="outline" onClick={() => handleRegen(p.key)}>
                    Regenerar token
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={url} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copy(url)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-slate-600" />
            Últimos eventos recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-2 py-1.5">Quando</th>
                  <th className="px-2 py-1.5">Provider</th>
                  <th className="px-2 py-1.5">Evento</th>
                  <th className="px-2 py-1.5">Email</th>
                  <th className="px-2 py-1.5">Empresa</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {(ev?.events ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-2 py-1.5">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-2 py-1.5">{e.provider}</td>
                    <td className="px-2 py-1.5">{e.event_type ?? "—"}</td>
                    <td className="px-2 py-1.5">{e.buyer_email ?? "—"}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{e.matched_company_id ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      {e.processed ? (
                        <span className="text-emerald-700">ok</span>
                      ) : (
                        <span className="text-red-700" title={e.error ?? ""}>erro</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!ev?.events || ev.events.length === 0) && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Nenhum evento ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
