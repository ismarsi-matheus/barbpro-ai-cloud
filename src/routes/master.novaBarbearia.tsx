import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createBarbershopWithOwner } from "@/lib/master.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Copy, Check, AlertTriangle, Search, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/master/novaBarbearia")({ component: NovaPage });

// ---------- helpers ----------
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
    [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}
function maskCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

const DIAS: { key: string; label: string }[] = [
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
];

const PLANOS = [
  { id: "starter", nome: "Starter", preco: 49, features: ["Agenda online", "Até 2 profissionais", "Suporte por email"] },
  { id: "pro", nome: "Pro", preco: 97, features: ["Agenda + financeiro", "Profissionais ilimitados", "AI Growth básico"] },
  { id: "premium", nome: "Premium", preco: 197, features: ["Tudo do Pro", "Relatórios avançados", "AI Growth completo", "Suporte prioritário"] },
] as const;

function todayPlus14(): string {
  const d = new Date(); d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

type Endereco = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };
type DayHours = { open: boolean; from: string; to: string };

function defaultHours(): Record<string, DayHours> {
  const r: Record<string, DayHours> = {};
  for (const d of DIAS) r[d.key] = { open: d.key !== "dom", from: "09:00", to: "19:00" };
  return r;
}

function NovaPage() {
  const navigate = useNavigate();
  const create = useServerFn(createBarbershopWithOwner);

  const [form, setForm] = useState({
    name: "", nome_fantasia: "", cnpj: "", logo_url: "",
    email_contato: "", telefone_comercial: "", whatsapp: "",
    endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" } as Endereco,
    slug: "", primary_color: "#1B3A4B",
    business_hours: defaultHours(),
    plano: "starter" as "starter" | "pro" | "premium",
    ciclo: "mensal" as "mensal" | "anual",
    valor_mensal: 49,
    status_cobranca: "trial" as "trial" | "ativo" | "inadimplente" | "suspenso" | "cancelado",
    trial_ate: todayPlus14(),
    nome_admin: "", email_admin: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState<"email" | "pwd" | "both" | null>(null);

  // slug auto-gerado a partir do nome fantasia
  useEffect(() => {
    if (!slugTouched) {
      const s = slugify(form.nome_fantasia || form.name);
      setForm((f) => ({ ...f, slug: s }));
    }
  }, [form.name, form.nome_fantasia, slugTouched]);

  // valor_mensal auto pelo plano (se ainda casa com algum preset)
  useEffect(() => {
    const p = PLANOS.find((p) => p.id === form.plano);
    if (p) setForm((f) => ({ ...f, valor_mensal: p.preco }));
  }, [form.plano]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink = useMemo(() => form.slug ? `${origin}/agendar/${form.slug}` : "", [origin, form.slug]);

  const checkSlug = async () => {
    if (!form.slug) return;
    setSlugStatus("checking");
    const { data } = await supabase.from("company").select("id").eq("slug", form.slug).maybeSingle();
    setSlugStatus(data ? "taken" : "ok");
  };

  const buscarCEP = async () => {
    const cep = form.endereco.cep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido"); return; }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await res.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setForm((f) => ({
        ...f,
        endereco: {
          ...f.endereco,
          logradouro: j.logradouro ?? "",
          bairro: j.bairro ?? "",
          cidade: j.localidade ?? "",
          uf: j.uf ?? "",
        },
      }));
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const setHours = (key: string, patch: Partial<DayHours>) =>
    setForm((f) => ({ ...f, business_hours: { ...f.business_hours, [key]: { ...f.business_hours[key], ...patch } } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus === "taken") { toast.error("Slug já em uso"); return; }
    if (!form.nome_fantasia.trim()) { toast.error("Nome fantasia é obrigatório"); return; }
    if (!form.email_admin.trim()) { toast.error("Email do admin é obrigatório"); return; }
    setSaving(true);
    try {
      const res = await create({ data: form });
      setCreds({ email: res.email, tempPassword: res.tempPassword });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar barbearia");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string, key: "email" | "pwd" | "both") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <PageHeader title="Nova barbearia" description="Cadastro completo pelo super admin" />

      <form onSubmit={submit} className="space-y-4">
        <Accordion type="multiple" defaultValue={["ident", "contato", "publica", "horarios", "plano", "admin"]} className="space-y-3">

          {/* IDENTIFICAÇÃO */}
          <AccordionItem value="ident" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">1. Identificação</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Razão social *</Label>
                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Nome fantasia *</Label>
                    <Input required value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
                  <div><Label>Logo URL</Label>
                    <div className="flex gap-2">
                      <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
                      <div className="w-10 h-10 rounded border flex items-center justify-center overflow-hidden bg-muted shrink-0">
                        {form.logo_url
                          ? <img src={form.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

          {/* CONTATO E ENDEREÇO */}
          <AccordionItem value="contato" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">2. Contato e endereço</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Email de contato *</Label>
                    <Input type="email" required value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} /></div>
                  <div><Label>Telefone comercial</Label>
                    <Input value={form.telefone_comercial} onChange={(e) => setForm({ ...form, telefone_comercial: maskPhone(e.target.value) })} placeholder="(11) 3333-4444" /></div>
                  <div><Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} placeholder="(11) 99999-9999" /></div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2"><Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input value={form.endereco.cep}
                        onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cep: maskCEP(e.target.value) } })}
                        placeholder="00000-000" />
                      <Button type="button" variant="outline" onClick={buscarCEP} disabled={cepLoading}>
                        <Search className="w-4 h-4 mr-1" />{cepLoading ? "…" : "Buscar"}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-3"><Label>Logradouro</Label>
                    <Input value={form.endereco.logradouro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })} /></div>
                  <div><Label>Número</Label>
                    <Input value={form.endereco.numero} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })} /></div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2"><Label>Complemento</Label>
                    <Input value={form.endereco.complemento} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })} /></div>
                  <div className="col-span-2"><Label>Bairro</Label>
                    <Input value={form.endereco.bairro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })} /></div>
                  <div className="col-span-1"><Label>Cidade</Label>
                    <Input value={form.endereco.cidade} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })} /></div>
                  <div><Label>UF</Label>
                    <Input maxLength={2} value={form.endereco.uf} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, uf: e.target.value.toUpperCase() } })} /></div>
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

          {/* PÁGINA PÚBLICA */}
          <AccordionItem value="publica" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">3. Página pública</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Slug</Label>
                    <Input value={form.slug}
                      onChange={(e) => { setSlugTouched(true); setSlugStatus("idle"); setForm({ ...form, slug: slugify(e.target.value) }); }}
                      onBlur={checkSlug} placeholder="minha-barbearia" />
                    <div className="text-xs mt-1 min-h-[18px]">
                      {slugStatus === "checking" && <span className="text-muted-foreground">Verificando…</span>}
                      {slugStatus === "ok" && <span className="text-emerald-600">✓ Disponível</span>}
                      {slugStatus === "taken" && <span className="text-red-600">✗ Já em uso</span>}
                      {publicLink && <span className="block text-muted-foreground">Link: <span className="font-mono">{publicLink}</span></span>}
                    </div>
                  </div>
                  <div>
                    <Label>Cor primária</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer" />
                      <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="font-mono" />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

          {/* HORÁRIOS */}
          <AccordionItem value="horarios" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">4. Horários de funcionamento</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-2">
                  {DIAS.map((d) => {
                    const h = form.business_hours[d.key];
                    return (
                      <div key={d.key} className="grid grid-cols-[100px_80px_1fr_1fr] gap-3 items-center">
                        <span className="text-sm font-medium">{d.label}</span>
                        <div className="flex items-center gap-2">
                          <Switch checked={h.open} onCheckedChange={(v) => setHours(d.key, { open: v })} />
                          <span className="text-xs text-muted-foreground">{h.open ? "Aberto" : "Fechado"}</span>
                        </div>
                        <Input type="time" value={h.from} disabled={!h.open} onChange={(e) => setHours(d.key, { from: e.target.value })} />
                        <Input type="time" value={h.to} disabled={!h.open} onChange={(e) => setHours(d.key, { to: e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

          {/* PLANO E COBRANÇA */}
          <AccordionItem value="plano" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">5. Plano e cobrança</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-4">
                <RadioGroup value={form.plano} onValueChange={(v) => setForm({ ...form, plano: v as any })} className="grid grid-cols-3 gap-3">
                  {PLANOS.map((p) => (
                    <label key={p.id} htmlFor={`plano-${p.id}`}
                      className={`cursor-pointer rounded-lg border p-4 transition ${form.plano === p.id ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/30 bg-[var(--brand)]/5" : "hover:border-foreground/30"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{p.nome}</span>
                        <RadioGroupItem id={`plano-${p.id}`} value={p.id} />
                      </div>
                      <div className="text-2xl font-bold mb-2">R$ {p.preco}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {p.features.map((f) => <li key={f}>• {f}</li>)}
                      </ul>
                    </label>
                  ))}
                </RadioGroup>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Ciclo</Label>
                    <RadioGroup value={form.ciclo} onValueChange={(v) => setForm({ ...form, ciclo: v as any })} className="flex gap-3 mt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="mensal" /> Mensal
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="anual" /> Anual
                      </label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Valor mensal (R$)</Label>
                    <Input type="number" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Status cobrança</Label>
                    <Select value={form.status_cobranca} onValueChange={(v) => setForm({ ...form, status_cobranca: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="max-w-xs">
                  <Label>Trial até</Label>
                  <Input type="date" value={form.trial_ate} onChange={(e) => setForm({ ...form, trial_ate: e.target.value })} />
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

          {/* ADMIN */}
          <AccordionItem value="admin" className="border-none">
            <Card><CardContent className="p-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="font-semibold">6. Admin da barbearia</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome do admin</Label>
                    <Input value={form.nome_admin} onChange={(e) => setForm({ ...form, nome_admin: e.target.value })} /></div>
                  <div>
                    <Label>Email do admin *</Label>
                    <div className="flex gap-2">
                      <Input type="email" required value={form.email_admin} onChange={(e) => setForm({ ...form, email_admin: e.target.value })} />
                      <Button type="button" variant="outline" onClick={() => setForm({ ...form, email_admin: form.email_contato })}>
                        Usar email contato
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Uma senha temporária será gerada automaticamente e exibida apenas uma vez. No primeiro login, o admin será obrigado a trocá-la.</p>
                </div>
              </AccordionContent>
            </CardContent></Card>
          </AccordionItem>

        </Accordion>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/master/listaBarbearias" })}>Cancelar</Button>
          <Button type="submit" disabled={saving || slugStatus === "taken"} className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            {saving ? "Criando…" : "Criar barbearia e gerar credenciais"}
          </Button>
        </div>
      </form>

      <Dialog open={!!creds} onOpenChange={(o) => { if (!o) { setCreds(null); navigate({ to: "/master/listaBarbearias" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Barbearia criada com sucesso</DialogTitle>
            <DialogDescription>
              Copie e envie estas credenciais ao responsável. A senha <b>não será mostrada novamente</b>.
              No primeiro login, será exigida a troca de senha.
            </DialogDescription>
          </DialogHeader>

          {creds && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creds.email} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(creds.email, "email")}>
                    {copied === "email" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Senha temporária</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creds.tempPassword} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(creds.tempPassword, "pwd")}>
                    {copied === "pwd" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Guarde antes de fechar. O super admin não consegue ver esta senha novamente — só gerar uma nova.</p>
              </div>

              <Button
                type="button"
                className="w-full bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
                onClick={() => copy(`Email: ${creds.email}\nSenha temporária: ${creds.tempPassword}`, "both")}
              >
                {copied === "both" ? <><Check className="w-4 h-4 mr-2" /> Copiado!</> : <><Copy className="w-4 h-4 mr-2" /> Copiar email + senha</>}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreds(null); navigate({ to: "/master/listaBarbearias" }); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
