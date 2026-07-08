import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { createTeamMember } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Scissors, ArrowRight, ArrowLeft, Check, Plus, Trash2, Mail, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export const Route = createFileRoute("/app/onboarding")({ component: Onboarding });

const STEPS = ["Barbearia", "Branding", "Equipe", "Serviços", "Pronto"];
const PRESET_COLORS = ["#1B3A4B", "#0F172A", "#7C3AED", "#DC2626", "#EA580C", "#16A34A", "#0EA5E9", "#DB2777"];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}

type Invite = { email: string; role: "admin" | "barbeiro" | "recepcao" | "financeiro" };
type ServiceDraft = { name: string; price: number; duration_minutes: number; category?: string };

function Onboarding() {
  const { user } = useAuth();
  const { data: company, refetch } = useCurrentCompany();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const createMemberFn = useServerFn(createTeamMember);

  const [step, setStep] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(company?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<Array<{ email: string; password: string }>>([]);
  const [credsOpen, setCredsOpen] = useState(false);

  // Step 0 — Dados
  const [dados, setDados] = useState({
    name: "", nome_fantasia: "", telefone_comercial: "", whatsapp: "", slug: "",
  });
  // Step 1 — Branding
  const [branding, setBranding] = useState({ primary_color: "#1B3A4B", logo_url: "" });
  // Step 2 — Equipe
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteForm, setInviteForm] = useState<Invite>({ email: "", role: "barbeiro" });
  // Step 3 — Serviços + categorias
  const [categories, setCategories] = useState<string[]>(["Cortes", "Barba"]);
  const [newCat, setNewCat] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "Corte Masculino", price: 50, duration_minutes: 40, category: "Cortes" },
    { name: "Barba", price: 35, duration_minutes: 30, category: "Barba" },
  ]);
  const [svcForm, setSvcForm] = useState<ServiceDraft>({ name: "", price: 50, duration_minutes: 30, category: "Cortes" });

  useEffect(() => {
    if (company) {
      setCompanyId(company.id);
      if (company.onboarding_step != null) setStep(Math.min(company.onboarding_step, 4));
      setDados({
        name: company.name ?? "", nome_fantasia: company.nome_fantasia ?? "",
        telefone_comercial: company.telefone_comercial ?? "", whatsapp: company.whatsapp ?? "",
        slug: company.slug ?? "",
      });
      setBranding({
        primary_color: company.primary_color ?? "#1B3A4B",
        logo_url: company.logo_url ?? "",
      });
    }
  }, [company]);

  const persistStep = async (next: number, extra: Record<string, any> = {}) => {
    if (!companyId) return;
    await supabase.from("company").update({ onboarding_step: next, ...extra }).eq("id", companyId);
  };

  // ===== STEP 0
  const submitDados = async () => {
    if (!user) return;
    if (!dados.name.trim()) { toast.error("Informe o nome da barbearia"); return; }
    setSaving(true);
    try {
      const slug = slugify(dados.slug || dados.nome_fantasia || dados.name);
      const payload = {
        name: dados.name,
        nome_fantasia: dados.nome_fantasia || dados.name,
        telefone_comercial: dados.telefone_comercial,
        whatsapp: dados.whatsapp,
        slug,
        created_by: user.id,
        onboarding_step: 1,
      };
      let cid = companyId;
      if (cid) {
        const { error } = await supabase.from("company").update(payload).eq("id", cid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("company").insert(payload).select("id").single();
        if (error) throw error;
        cid = data.id;
        setCompanyId(cid);
        await supabase.from("company_user").insert({
          company_id: cid, user_id: user.id, email: user.email ?? "",
          nome: (user.user_metadata as any)?.nome ?? user.email, role: "owner",
          convite_aceito: true,
        });
      }
      await qc.invalidateQueries({ queryKey: ["current-company"] });
      await refetch();
      setStep(1);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ===== STEP 1
  const submitBranding = async () => {
    setSaving(true);
    try {
      await persistStep(2, { primary_color: branding.primary_color, logo_url: branding.logo_url || null });
      await qc.invalidateQueries({ queryKey: ["current-company"] });
      setStep(2);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ===== STEP 2
  const addInvite = () => {
    if (!inviteForm.email.trim()) return;
    if (invites.some((i) => i.email === inviteForm.email)) { toast.error("Email já adicionado"); return; }
    setInvites([...invites, { ...inviteForm, email: inviteForm.email.toLowerCase().trim() }]);
    setInviteForm({ email: "", role: "barbeiro" });
  };
  const submitEquipe = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const generated: Array<{ email: string; password: string }> = [];
      for (const i of invites) {
        const res = await createMemberFn({ data: {
          company_id: companyId,
          email: i.email,
          role: i.role,
          generate_password: true,
        } });
        generated.push({ email: res.email, password: res.password });
      }
      if (generated.length > 0) {
        setCreatedCreds(generated);
        setCredsOpen(true);
      }
      await persistStep(3);
      setStep(3);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ===== STEP 3
  const addCategory = () => {
    const n = newCat.trim(); if (!n) return;
    if (categories.includes(n)) { toast.error("Categoria já existe"); return; }
    setCategories([...categories, n]); setNewCat("");
  };
  const addService = () => {
    if (!svcForm.name.trim()) { toast.error("Nome do serviço"); return; }
    setServices([...services, svcForm]);
    setSvcForm({ name: "", price: 50, duration_minutes: 30, category: categories[0] });
  };
  const submitServicos = async () => {
    if (!companyId) return;
    if (services.length === 0) { toast.error("Adicione pelo menos um serviço"); return; }
    setSaving(true);
    try {
      const catIdByName: Record<string, string> = {};
      for (let i = 0; i < categories.length; i++) {
        const { data, error } = await supabase.from("service_category")
          .insert({ company_id: companyId, name: categories[i], sort_order: i + 1, active: true })
          .select("id").single();
        if (error) throw error;
        catIdByName[categories[i]] = data.id;
      }
      const rows = services.map((s) => ({
        company_id: companyId, name: s.name, price: s.price, duration_minutes: s.duration_minutes,
        active: true, category_id: s.category ? catIdByName[s.category] ?? null : null,
      }));
      const { error: se } = await supabase.from("service").insert(rows);
      if (se) throw se;
      await persistStep(4);
      setStep(4);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ===== STEP 4
  const finalizar = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const trialAte = format(addDays(new Date(), 14), "yyyy-MM-dd");
      await supabase.from("company").update({
        onboarding_concluido: true, onboarding_step: 5,
        status_cobranca: "trial", trial_ate: trialAte,
      }).eq("id", companyId);
      await qc.invalidateQueries({ queryKey: ["current-company"] });
      toast.success("Bem-vindo! Seu trial de 14 dias começou.");
      navigate({ to: "/app/dashboard" });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const trialEnd = format(addDays(new Date(), 14), "dd/MM/yyyy");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] py-10 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">BarbeiroPro AI</span>
          </div>
          <CardTitle>Configuração inicial — {STEPS[step]}</CardTitle>
          <CardDescription>Passo {step + 1} de 5</CardDescription>
          <Progress value={((step + 1) / 5) * 100} className="mt-3" />
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <form onSubmit={(e) => { e.preventDefault(); submitDados(); }} className="space-y-3">
              <div><Label>Nome da barbearia *</Label>
                <Input value={dados.name} onChange={(e) => setDados({ ...dados, name: e.target.value })} /></div>
              <div><Label>Nome fantasia</Label>
                <Input value={dados.nome_fantasia} onChange={(e) => setDados({ ...dados, nome_fantasia: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label>
                  <Input value={dados.telefone_comercial} onChange={(e) => setDados({ ...dados, telefone_comercial: e.target.value })} /></div>
                <div><Label>WhatsApp</Label>
                  <Input value={dados.whatsapp} onChange={(e) => setDados({ ...dados, whatsapp: e.target.value })} /></div>
              </div>
              <div><Label>Link público (slug)</Label>
                <Input placeholder="minha-barbearia" value={dados.slug} onChange={(e) => setDados({ ...dados, slug: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Sua página será /agendar/{slugify(dados.slug || dados.nome_fantasia || dados.name) || "..."}</p>
              </div>
              <NavRow saving={saving} onNext={submitDados} canBack={false} />
            </form>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Cor principal da marca</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setBranding({ ...branding, primary_color: c })}
                      className={`w-9 h-9 rounded-md border-2 transition ${branding.primary_color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <Input type="color" value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-12 h-9 p-1" />
                </div>
              </div>
              <div>
                <Label>URL do logo (opcional)</Label>
                <Input placeholder="https://..." value={branding.logo_url}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })} />
              </div>
              <div className="rounded-lg border p-4 flex items-center gap-3" style={{ backgroundColor: branding.primary_color }}>
                {branding.logo_url
                  ? <img src={branding.logo_url} alt="" className="w-10 h-10 rounded object-cover bg-white" onError={(e) => (e.currentTarget.style.display = "none")} />
                  : <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center text-white"><Scissors className="w-5 h-5" /></div>
                }
                <div className="text-white">
                  <p className="font-semibold">{dados.nome_fantasia || dados.name || "Sua barbearia"}</p>
                  <p className="text-xs opacity-80">Prévia do branding</p>
                </div>
              </div>
              <NavRow saving={saving} onBack={() => setStep(0)} onNext={submitBranding} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cadastre barbeiros e atendentes. Uma senha será gerada e mostrada na próxima tela — sem envio de email.
              </p>
              <div className="flex gap-2">
                <Input placeholder="email@exemplo.com" value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInvite(); } }} />
                <select className="border rounded-md px-2 text-sm bg-background"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}>
                  <option value="admin">Admin</option>
                  <option value="barbeiro">Barbeiro</option>
                  <option value="recepcao">Recepção</option>
                  <option value="financeiro">Financeiro</option>
                </select>
                <Button type="button" variant="outline" onClick={addInvite}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {invites.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/30">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{i.email}</span>
                      <Badge variant="outline" className="text-xs">{i.role}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setInvites(invites.filter((_, x) => x !== idx))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {invites.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum convite. Você pode pular e adicionar depois.</p>}
              </div>
              <NavRow saving={saving} onBack={() => setStep(1)} onNext={submitEquipe} nextLabel={invites.length ? "Criar acessos e continuar" : "Pular"} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Categorias</Label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Ex.: Combo, Coloração" value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
                  <Button type="button" variant="outline" onClick={addCategory}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {categories.map((c) => (
                    <Badge key={c} variant="secondary" className="cursor-pointer"
                      onClick={() => setCategories(categories.filter((x) => x !== c))}>
                      {c} ✕
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <Label>Adicionar serviço</Label>
                <div className="grid grid-cols-12 gap-2 mt-1">
                  <Input className="col-span-5" placeholder="Nome" value={svcForm.name}
                    onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} />
                  <Input className="col-span-2" type="number" placeholder="R$" value={svcForm.price}
                    onChange={(e) => setSvcForm({ ...svcForm, price: parseFloat(e.target.value) || 0 })} />
                  <Input className="col-span-2" type="number" placeholder="min" value={svcForm.duration_minutes}
                    onChange={(e) => setSvcForm({ ...svcForm, duration_minutes: parseInt(e.target.value) || 0 })} />
                  <select className="col-span-2 border rounded-md px-2 text-sm bg-background"
                    value={svcForm.category ?? ""}
                    onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value || undefined })}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button type="button" className="col-span-1" variant="outline" onClick={addService}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {services.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/30 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                      <span className="text-muted-foreground">R$ {s.price.toFixed(2)} · {s.duration_minutes}min</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setServices(services.filter((_, x) => x !== idx))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {services.length === 0 && <p className="text-xs text-muted-foreground italic">Adicione pelo menos 1 serviço.</p>}
              </div>

              <NavRow saving={saving} onBack={() => setStep(2)} onNext={submitServicos} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Tudo pronto!</h3>
                <p className="text-sm text-muted-foreground mt-1">Sua barbearia está configurada.</p>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-[var(--brand)] to-[#2d5a6e] text-white p-5 text-left">
                <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" /><span className="font-semibold">Trial de 14 dias liberado</span></div>
                <p className="text-sm text-white/85">Você tem acesso completo até <strong>{trialEnd}</strong>. Sem cartão necessário.</p>
              </div>
              <Button onClick={finalizar} disabled={saving} className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
                {saving ? "Iniciando…" : "Começar a usar"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acessos criados</DialogTitle>
            <DialogDescription>
              Envie os dados para cada pessoa. Eles entram em <b>/entrar</b>. As senhas não serão mostradas novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {createdCreds.map((c, i) => {
              const txt = `Email: ${c.email}\nSenha: ${c.password}\nPainel: ${typeof window !== "undefined" ? window.location.origin : ""}/entrar`;
              return (
                <div key={i} className="border rounded-md p-3 text-sm space-y-1 bg-muted/30">
                  <div className="font-mono text-xs">{c.email}</div>
                  <div className="font-mono text-xs">{c.password}</div>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(txt); toast.success("Copiado"); }}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setCredsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavRow({
  saving, onBack, onNext, nextLabel = "Próximo", canBack = true,
}: { saving: boolean; onBack?: () => void; onNext: () => void; nextLabel?: string; canBack?: boolean }) {
  return (
    <div className="flex justify-between pt-2">
      {canBack && onBack
        ? <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        : <span />}
      <Button type="button" disabled={saving} onClick={onNext}
        className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
        {saving ? "Salvando…" : nextLabel} <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
