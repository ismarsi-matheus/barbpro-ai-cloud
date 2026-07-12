import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientSession } from "@/hooks/use-client-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cliente/perfil")({
  ssr: false,
  component: PerfilPage,
});

function PerfilPage() {
  const { session, loading } = useClientSession();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", cpf: "", birthdate: "",
    cep: "", endereco: "", cidade: "", estado: "", photo_url: "",
  });

  useEffect(() => {
    if (!session) return;
    supabase.from("client_profile").select("*").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? session.user.email ?? "",
          cpf: data.cpf ?? "",
          birthdate: data.birthdate ?? "",
          cep: data.cep ?? "",
          endereco: data.endereco ?? "",
          cidade: data.cidade ?? "",
          estado: data.estado ?? "",
          photo_url: data.photo_url ?? "",
        });
      } else {
        setForm((f) => ({ ...f, email: session.user.email ?? "" }));
      }
    });
  }, [session]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = { user_id: session.user.id, ...form };
    if (!payload.birthdate) payload.birthdate = null;
    const { error } = await supabase.from("client_profile").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link to="/cliente"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button></Link>
          <span className="font-semibold">Meu perfil</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome completo</Label><Input required value={form.full_name} onChange={set("full_name")} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={set("phone")} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={set("cpf")} /></div>
              <div><Label>Data de nascimento</Label><Input type="date" value={form.birthdate} onChange={set("birthdate")} /></div>
              <div><Label>CEP</Label><Input value={form.cep} onChange={set("cep")} /></div>
              <div className="sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={set("endereco")} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={set("cidade")} /></div>
              <div><Label>Estado</Label><Input value={form.estado} onChange={set("estado")} maxLength={2} /></div>
              <div className="sm:col-span-2"><Label>Foto (URL)</Label><Input value={form.photo_url} onChange={set("photo_url")} placeholder="https://..." /></div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
