import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  useClientProfile,
  useClientSession,
  useInvalidateClientArea,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu perfil — BarbeiroPro" },
      { name: "description", content: "Atualize seus dados pessoais e preferências." },
      { property: "og:title", content: "Meu perfil — BarbeiroPro" },
      { property: "og:description", content: "Atualize seus dados pessoais e preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfilPage,
});

const EMPTY = {
  full_name: "",
  phone: "",
  email: "",
  cpf: "",
  birthdate: "",
  cep: "",
  endereco: "",
  cidade: "",
  estado: "",
  photo_url: "",
  favorite_company_id: "",
  favorite_professional_id: "",
  favorite_service_id: "",
  notify_email: true,
  notify_whatsapp: true,
  notify_reminders: true,
};

function PerfilPage() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const profileQ = useClientProfile(session?.user.id);
  const invalidate = useInvalidateClientArea();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const data = profileQ.data as Record<string, unknown> | null | undefined;
    if (!session) return;
    if (data) {
      const notif = (data["notifications"] ?? {}) as Record<string, unknown>;
      const str = (k: string) => (data[k] as string | null) ?? "";
      const bool = (k: string) => notif[k] !== false;
      setForm({
        full_name: str("full_name"),
        phone: str("phone"),
        email: str("email") || session.user.email || "",
        cpf: str("cpf"),
        birthdate: str("birthdate"),
        cep: str("cep"),
        endereco: str("endereco"),
        cidade: str("cidade"),
        estado: str("estado"),
        photo_url: str("photo_url"),
        favorite_company_id: str("favorite_company_id"),
        favorite_professional_id: str("favorite_professional_id"),
        favorite_service_id: str("favorite_service_id"),
        notify_email: bool("email"),
        notify_whatsapp: bool("whatsapp"),
        notify_reminders: bool("reminders"),
      });
    } else {
      setForm((f) => ({ ...f, email: session.user.email ?? "" }));
    }
  }, [profileQ.data, session]);

  // Barbearias que o cliente já frequentou (para escolher a favorita)
  const companiesQ = useQuery({
    queryKey: ["client-companies", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_client_appointments");
      const map = new Map<string, string>();
      (data ?? []).forEach((a: { company_id: string; company_name: string | null }) =>
        map.set(a.company_id, a.company_name ?? "Barbearia"),
      );
      return [...map.entries()];
    },
  });

  const professionalsQ = useQuery({
    queryKey: ["client-professionals", form.favorite_company_id],
    enabled: !!form.favorite_company_id,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_public_professionals", {
        _company_id: form.favorite_company_id,
      });
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const set =
    (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!form.full_name.trim()) return toast.error("Informe seu nome completo.");
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      cpf: form.cpf || null,
      birthdate: form.birthdate || null,
      cep: form.cep || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      photo_url: form.photo_url || null,
      favorite_company_id: form.favorite_company_id || null,
      favorite_professional_id: form.favorite_professional_id || null,
      favorite_service_id: form.favorite_service_id || null,
      notifications: {
        email: form.notify_email,
        whatsapp: form.notify_whatsapp,
        reminders: form.notify_reminders,
      },
    };
    const { error } = await supabase
      .from("client_profile")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidate();
    toast.success("Perfil atualizado com sucesso!");
  };

  const iniciais = (form.full_name || session?.user.email || "CL")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <ClientShell
      title="Meu perfil"
      subtitle="Dados pessoais e preferências"
      user={{
        name: form.full_name || dash.data?.profile?.full_name,
        email: session?.user.email,
        photo: form.photo_url,
      }}
    >
      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
            <CardDescription>Usados para identificar você nos agendamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {form.photo_url ? <AvatarImage src={form.photo_url} alt={form.full_name} /> : null}
                <AvatarFallback>{iniciais}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="photo">Foto (URL)</Label>
                <Input
                  id="photo"
                  value={form.photo_url}
                  onChange={set("photo_url")}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" required value={form.full_name} onChange={set("full_name")} />
              </div>
              <div>
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={form.cpf} onChange={set("cpf")} />
              </div>
              <div>
                <Label htmlFor="nasc">Data de nascimento</Label>
                <Input id="nasc" type="date" value={form.birthdate} onChange={set("birthdate")} />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={set("cep")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="end">Endereço</Label>
                <Input id="end" value={form.endereco} onChange={set("endereco")} />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={set("cidade")} />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" maxLength={2} value={form.estado} onChange={set("estado")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
            <CardDescription>Deixe seus agendamentos ainda mais rápidos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Barbearia favorita</Label>
              <Select
                value={form.favorite_company_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    favorite_company_id: v === "none" ? "" : v,
                    favorite_professional_id: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(companiesQ.data ?? []).map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profissional favorito</Label>
              <Select
                value={form.favorite_professional_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, favorite_professional_id: v === "none" ? "" : v }))
                }
                disabled={!form.favorite_company_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(professionalsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notificações</CardTitle>
            <CardDescription>Escolha como quer ser avisado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["notify_email", "Emails de confirmação e alterações"],
                ["notify_reminders", "Lembretes antes do atendimento"],
                ["notify_whatsapp", "Mensagens no WhatsApp"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label htmlFor={key} className="font-normal">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={form[key]}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      </form>
    </ClientShell>
  );
}
