import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  createClubCheckoutSession,
  getClubCheckoutStatus,
} from "@/lib/club/club-checkout.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { Scissors, Clock, CheckCircle2, Crown } from "lucide-react";
import {
  ClubChoiceStep,
  type ClubMembership,
  type ClubPlan,
} from "@/components/club-choice-step";
import { IdentificationStep } from "@/components/client/identification-step";
import { format, addDays, startOfDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/agendar/$slug")({
  component: AgendarPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    servico?: string;
    profissional?: string;
    club_session?: string;
    club_cancel?: string;
  } => {
    const out: {
      servico?: string;
      profissional?: string;
      club_session?: string;
      club_cancel?: string;
    } = {};
    if (typeof search["servico"] === "string") out.servico = search["servico"];
    if (typeof search["profissional"] === "string") out.profissional = search["profissional"];
    if (typeof search["club_session"] === "string") out.club_session = search["club_session"];
    if (typeof search["club_cancel"] === "string") out.club_cancel = search["club_cancel"];
    return out;
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] text-center px-4">
      <div>
        <h1 className="text-2xl font-semibold">Barbearia não encontrada</h1>
        <p className="text-muted-foreground mt-2">
          O link parece estar incorreto.
        </p>
      </div>
    </div>
  ),
});

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function AgendarPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();

  const companyQuery = useQuery({
    queryKey: ["public-company", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company")
        .select("id,name,nome_fantasia,logo_url,primary_color,whatsapp,endereco")
        .eq("slug", slug)
        .maybeSingle();
      if (error) { console.error("[agendar] company error", error); throw error; }
      return data;
    },
    retry: false,
  });

  const company = companyQuery.data;

  const servicesQuery = useQuery({
    queryKey: ["public-services", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service")
        .select("id,name,price,duration_minutes,category_id")
        .eq("company_id", company!.id)
        .eq("active", true)
        .order("name");
      if (error) { console.error("[agendar] services error", error); return []; }
      return data ?? [];
    },
    retry: false,
  });

  const proQuery = useQuery({
    queryKey: ["public-pros", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional")
        .select("id,name,specialty,photo_url")
        .eq("company_id", company!.id)
        .eq("active", true)
        .order("name");
      if (error) { console.error("[agendar] pros error", error); return []; }
      return data ?? [];
    },
    retry: false,
  });

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [serviceId, setServiceId] = useState<string>("");
  const [proId, setProId] = useState<string>("");
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string>("");
  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [clientSession, setClientSession] = useState<Session | null>(null);
  const [pagamentoTipo, setPagamentoTipo] = useState<"normal" | "clube">("normal");
  const [chosenMembership, setChosenMembership] = useState<ClubMembership | null>(null);
  // Identificação (etapa 5): "auth" = cliente logado, "guest" = visitante
  const [identMode, setIdentMode] = useState<"auth" | "guest" | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  // Clube / checkout
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [clubInitialView, setClubInitialView] = useState<"choice" | "club" | "plans">("choice");
  const [draftRestored, setDraftRestored] = useState(false);
  const [clubActivatedNotified, setClubActivatedNotified] = useState(false);

  const DRAFT_KEY = `bp:booking-draft:${slug}`;

  // Cliente logado (ou recém-autenticado) em barbearia sem Clube: pula a etapa 5
  useEffect(() => {
    if (
      step === 5 &&
      (clientSession || identMode === "auth") &&
      clubPlansQuery.isFetched &&
      !companyHasClub &&
      !search.club_session
    ) {
      setStep(6);
    }
  });

  // "Agendar novamente": pré-seleciona serviço/profissional vindos da Área do Cliente
  useEffect(() => {
    if (prefilled) return;
    if (!servicesQuery.data || !proQuery.data) return;
    const svc = search.servico && servicesQuery.data.find((s) => s.id === search.servico);
    const prof = search.profissional && proQuery.data.find((p) => p.id === search.profissional);
    if (svc) setServiceId(svc.id);
    if (prof) setProId(prof.id);
    if (svc && prof) setStep(3);
    else if (svc) setStep(2);
    if (svc || prof) setPrefilled(true);
  }, [servicesQuery.data, proQuery.data, search.servico, search.profissional, prefilled]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setClientSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setClientSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!clientSession) return;
    supabase.from("client_profile").select("full_name,phone,email").eq("user_id", clientSession.user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setNome((v) => v || data.full_name || "");
        setPhone((v) => v || data.phone || "");
        setEmail((v) => v || data.email || clientSession.user.email || "");
      } else {
        setEmail((v) => v || clientSession.user.email || "");
        const meta: any = clientSession.user.user_metadata || {};
        setNome((v) => v || meta.full_name || "");
        setPhone((v) => v || meta.phone || "");
      }
    });
  }, [clientSession]);

  // Clube: planos públicos da barbearia + assinatura do cliente logado
  const clubPlansQuery = useQuery({
    queryKey: ["club-plans-public", company?.id],
    enabled: !!company?.id,
    queryFn: async () =>
      (await supabase.rpc("get_public_club_plans", { _company_id: company!.id })).data ?? [],
    retry: false,
  });

  const membershipQuery = useQuery({
    queryKey: ["club-membership", company?.id, clientSession?.user.id],
    enabled: !!company?.id && !!clientSession,
    queryFn: async () =>
      (await supabase.rpc("get_my_club_memberships", { _company_id: company!.id })).data ?? [],
    retry: false,
  });

  const memberships = (membershipQuery.data ?? []) as unknown as ClubMembership[];
  const clubPlans = (clubPlansQuery.data ?? []) as unknown as ClubPlan[];
  const companyHasClub = clubPlans.length > 0 || memberships.length > 0;

  const membership = chosenMembership;
  const usandoClube = pagamentoTipo === "clube" && !!membership;

  // ---------------------------------------------------------------
  // Clube: checkout Stripe + retomada do agendamento após o pagamento
  // ---------------------------------------------------------------
  const startClubCheckoutFn = useServerFn(createClubCheckoutSession);
  const clubStatusFn = useServerFn(getClubCheckoutStatus);

  // Restaura o rascunho do agendamento ao voltar do Stripe.
  useEffect(() => {
    if (draftRestored) return;
    if (!search.club_session) {
      setDraftRestored(true);
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.serviceId) setServiceId(d.serviceId);
        if (d.proId) setProId(d.proId);
        if (d.date) setDate(new Date(d.date));
        if (d.time) setTime(d.time);
        if (d.nome) setNome((v) => v || d.nome);
        if (d.phone) setPhone((v) => v || d.phone);
        if (d.email) setEmail((v) => v || d.email);
        setPrefilled(true);
        setIdentMode("auth");
        setClubInitialView("club");
        setStep(5);
      }
    } catch (e) {
      console.error("[agendar] falha ao restaurar rascunho", e);
    }
    setDraftRestored(true);
  }, [search.club_session, draftRestored, DRAFT_KEY]);

  useEffect(() => {
    if (search.club_cancel) {
      toast.info("Pagamento cancelado. Você pode continuar sem o Clube.");
    }
  }, [search.club_cancel]);

  const clubStatusQuery = useQuery({
    queryKey: ["club-checkout-status", search.club_session],
    enabled: !!search.club_session && !!clientSession,
    queryFn: () => clubStatusFn({ data: { sessionId: search.club_session! } }),
    refetchInterval: (q) => (q.state.data?.membershipActive ? false : 3000),
    retry: 2,
  });

  useEffect(() => {
    if (!clubStatusQuery.data?.membershipActive || clubActivatedNotified) return;
    setClubActivatedNotified(true);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    membershipQuery.refetch();
    setClubInitialView("club");
    toast.success("Assinatura do Clube ativada! Continue seu agendamento.");
  }, [clubStatusQuery.data?.membershipActive, clubActivatedNotified, DRAFT_KEY, membershipQuery]);

  const clubProcessing =
    !!search.club_session && clubStatusQuery.data?.membershipActive !== true;

  const startClubCheckout = async (plan: ClubPlan, contact: { name: string; phone: string }) => {
    if (!company?.id) return;
    if (!clientSession) {
      toast.error("Entre na sua conta para assinar o Clube.");
      return;
    }
    setSubscribingPlanId(plan.id);
    try {
      // Preserva todo o contexto do agendamento para retomar após o pagamento.
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          serviceId,
          proId,
          date: date.toISOString(),
          time,
          nome: contact.name || nome,
          phone: contact.phone || phone,
          email,
        }),
      );
      const res = await startClubCheckoutFn({
        data: {
          companyId: company.id,
          clubPlanId: plan.id,
          slug,
          origin: window.location.origin,
          name: contact.name,
          phone: contact.phone,
          returnPath: `/agendar/${slug}`,
        },
      });
      if (!res?.url) throw new Error("URL de pagamento não retornada.");
      window.location.href = res.url;
    } catch (err: any) {
      console.error("[agendar] club checkout error", err);
      toast.error(err?.message ?? "Não foi possível abrir o pagamento.");
      setSubscribingPlanId(null);
    }
  };








  const service = useMemo(
    () => servicesQuery.data?.find((s) => s.id === serviceId),
    [servicesQuery.data, serviceId]
  );
  const pro = useMemo(
    () => proQuery.data?.find((p) => p.id === proId),
    [proQuery.data, proId]
  );

  // Schedule + blocks
  const schedQuery = useQuery({
    queryKey: ["public-sched", proId],
    enabled: !!proId,
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_schedule").select("*").eq("professional_id", proId);
      if (error) { console.error("[agendar] schedule error", error); return []; }
      return data ?? [];
    },
    retry: false,
  });
  const blocksQuery = useQuery({
    queryKey: ["public-blocks", proId],
    enabled: !!proId,
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_block").select("start_date,end_date").eq("professional_id", proId);
      if (error) { console.error("[agendar] blocks error", error); return []; }
      return data ?? [];
    },
    retry: false,
  });
  const availabilityLoading = !!proId && (schedQuery.isLoading || blocksQuery.isLoading);

  const isBlocked = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    return (blocksQuery.data ?? []).some((b: any) => iso >= b.start_date && iso <= b.end_date);
  };
  const daySched = (d: Date) => {
    const wd = d.getDay();
    const list = (schedQuery.data ?? []) as any[];
    if (list.length === 0) return null;
    return list.find((s) => s.weekday === wd) ?? null;
  };

  const slots = useMemo(() => {
    const list: string[] = [];
    if (availabilityLoading || isBlocked(date)) return list;
    const s = daySched(date);
    if (s && !s.is_working) return list;
    const step = s?.slot_minutes ?? 30;
    const [sh, sm] = (s?.start_time ?? "09:00").slice(0, 5).split(":").map(Number);
    const [eh, em] = (s?.end_time ?? "19:00").slice(0, 5).split(":").map(Number);
    const [lsH, lsM] = s?.lunch_start ? s.lunch_start.slice(0, 5).split(":").map(Number) : [NaN, NaN];
    const [leH, leM] = s?.lunch_end ? s.lunch_end.slice(0, 5).split(":").map(Number) : [NaN, NaN];
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const lStart = Number.isFinite(lsH) ? lsH * 60 + lsM : null;
    const lEnd = Number.isFinite(leH) ? leH * 60 + leM : null;
    for (let m = startMin; m < endMin; m += step) {
      if (lStart != null && lEnd != null && m >= lStart && m < lEnd) continue;
      list.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return list;
  }, [schedQuery.data, blocksQuery.data, availabilityLoading, date]);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  const dayUnavailable = (d: Date) => {
    if (availabilityLoading) return true;
    if (isBlocked(d)) return true;
    const s = daySched(d);
    if (!s) return true;
    if (s && !s.is_working) return true;
    return false;
  };

  // Agendamentos existentes para profissional + dia => slots indisponíveis

  // Horários ocupados via RPC (sem PII)
  const busyQuery = useQuery({
    queryKey: ["busy", company?.id, proId, format(date, "yyyy-MM-dd")],
    enabled: !!company?.id && !!proId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("get_busy_slots", {
          _company_id: company!.id,
          _professional_id: proId,
          _date: format(date, "yyyy-MM-dd"),
        });
        if (error) { console.error("[agendar] busy rpc error", error); return []; }
        return (data ?? []) as Array<{ starts_at: string; ends_at: string }>;
      } catch (e) {
        console.error("[agendar] busy exception", e);
        return [];
      }
    },
    retry: false,
  });

  const unavailable = useMemo(() => {
    const set = new Set<string>();
    const list = busyQuery.data ?? [];
    const dur = service?.duration_minutes ?? 30;
    for (const t of slots) {
      const [hh, mm] = t.split(":").map(Number);
      const slotStart = addMinutes(addMinutes(startOfDay(date), hh * 60), mm).getTime();
      const slotEnd = slotStart + dur * 60_000;
      for (const b of list) {
        const bStart = new Date(b.starts_at).getTime();
        const bEnd = new Date(b.ends_at).getTime();
        if (slotStart < bEnd && bStart < slotEnd) { set.add(t); break; }
      }
    }
    return set;
  }, [busyQuery.data, slots, date, service?.duration_minutes]);

  // NÃO usar throw notFound() dentro de useEffect — derruba a árvore inteira.
  const companyMissing = companyQuery.isFetched && !company;

  const submit = async () => {
    if (!company) {
      toast.error("Barbearia inválida para agendamento.");
      return;
    }
    if (!service) {
      toast.error("Escolha um serviço antes de confirmar.");
      return;
    }
    if (!pro) {
      toast.error("Escolha um profissional antes de confirmar.");
      return;
    }
    if (!time || !slots.includes(time)) {
      toast.error("Escolha um horário válido antes de confirmar.");
      return;
    }
    if (unavailable.has(time)) {
      toast.error("Esse horário acabou de ser reservado, escolha outro");
      busyQuery.refetch();
      return;
    }

    const customerName = nome.trim();
    const customerPhone = phone.trim();
    if (!customerName) {
      toast.error("Informe seu nome para confirmar o agendamento.");
      return;
    }
    if (customerPhone.length < 6) {
      toast.error("Informe um telefone válido para confirmar o agendamento.");
      return;
    }

    setSubmitting(true);
    try {
      const [hh, mm] = time.split(":").map(Number);
      const scheduledAt = addMinutes(addMinutes(date, hh * 60), mm);
      const endAt = addMinutes(scheduledAt, service.duration_minutes);

      // Checagem prévia de conflito via RPC (sem PII) — UX rápida
      try {
        const { data: clash, error: clashErr } = await supabase.rpc("get_busy_slots", {
          _company_id: company.id,
          _professional_id: pro.id,
          _date: format(date, "yyyy-MM-dd"),
        });
        if (clashErr) {
          console.error("[agendar] conflict check error", clashErr);
        } else {
          const hasConflict = (clash ?? []).some((a: any) => {
            const bStart = new Date(a.starts_at).getTime();
            const bEnd = new Date(a.ends_at).getTime();
            return scheduledAt.getTime() < bEnd && bStart < endAt.getTime();
          });
          if (hasConflict) {
            setSubmitting(false);
            busyQuery.refetch();
            toast.error("Esse horário acabou de ser reservado, escolha outro");
            return;
          }
        }
      } catch (e) {
        console.error("[agendar] conflict check exception", e);
      }

      // Upsert de cliente: usa versão autenticada quando há sessão (vincula user_id)
      const customerEmail = email.trim() || null;
      const rpcName = clientSession ? "upsert_customer_for_user" : "upsert_customer_public";
      const rpcArgs: any = clientSession
        ? { _company_id: company.id, _name: customerName, _phone: customerPhone, _email: customerEmail }
        : { _company_id: company.id, _name: customerName, _phone: customerPhone };
      const { data: customerId, error: cErr } = await supabase.rpc(rpcName as any, rpcArgs);
      console.log("[agendar] upsert result", { rpcName, customerId, error: cErr });
      if (cErr || !customerId) {
        setSubmitting(false);
        toast.error("Erro ao registrar cliente: " + (cErr?.message ?? "desconhecido"));
        return;
      }

      const appointmentPayload = {
        id: crypto.randomUUID(),
        company_id: company.id,
        customer_id: customerId,
        professional_id: pro.id,
        service_id: service.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        professional_name: pro.name,
        service_name: service.name,
        price: usandoClube ? 0 : service.price,
        scheduled_at: scheduledAt.toISOString(),
        source: "online" as const,
        status: "agendado" as const,
        pagamento_tipo: usandoClube ? "clube" : "normal",
        club_member_id: usandoClube ? (membership as any).id : null,

      };

      const missingRequired = ([
        "company_id",
        "customer_id",
        "professional_id",
        "service_id",
        "scheduled_at",
        "source",
        "status",
      ] as const).filter((field) => !appointmentPayload[field]);

      console.log("[agendar] appointment insert payload", appointmentPayload);

      if (missingRequired.length) {
        setSubmitting(false);
        console.error("[agendar] missing required appointment fields", missingRequired, appointmentPayload);
        toast.error("Dados do agendamento incompletos. Revise serviço, profissional, data e horário.");
        return;
      }

      const { error: aErr } = await supabase
        .from("appointment")
        .insert(appointmentPayload);

      if (aErr) {
        setSubmitting(false);
        if (aErr.message?.includes("reservado") || (aErr as any).code === "P0001") {
          busyQuery.refetch();
          toast.error("Esse horário acabou de ser reservado, escolha outro");
          return;
        }
        toast.error("Erro ao agendar: " + aErr.message);
        return;
      }

      let clubeAplicado = usandoClube;
      if (usandoClube) {
        const { data: ok, error: rErr } = await supabase.rpc("redeem_club_benefit", {
          _appointment_id: appointmentPayload.id,
          _club_member_id: (membership as any).id,
        });
        if (rErr || !ok) {
          console.error("[agendar] redeem club benefit failed", rErr);
          clubeAplicado = false;
          // Reverte para agendamento normal para não deixar o preço zerado sem benefício.
          await supabase
            .from("appointment")
            .update({ pagamento_tipo: "normal", club_member_id: null, price: service.price })
            .eq("id", appointmentPayload.id);
          toast.warning(
            rErr?.message ??
              "Agendamento criado, mas o benefício do Clube não pôde ser aplicado. Ele seguirá como pagamento normal.",
          );
        }
        membershipQuery.refetch();
      }

      setSubmitting(false);
      setConfirmed(appointmentPayload.id);
      setPagamentoTipo(clubeAplicado ? "clube" : "normal");
      if (clubeAplicado) {
        toast.success("Agendamento confirmado com benefício do Clube!");
      } else if (!usandoClube) {
        toast.success("Agendamento confirmado!");
      }



      // Dispara e-mail de confirmação (fire-and-forget)
      try {
        const { notifyAppointmentEvent } = await import("@/lib/email/notify.functions");
        void notifyAppointmentEvent({ data: { appointmentId: appointmentPayload.id, kind: "created" } });
      } catch (e) {
        console.error("[agendar] notify failed", e);
      }

    } catch (e: any) {
      console.error("[agendar] submit exception", e);
      setSubmitting(false);
      toast.error("Erro inesperado ao agendar. Tente novamente.");
    }
  };

  const downloadICS = () => {
    if (!service || !pro || !time || !company) return;
    const [hh, mm] = time.split(":").map(Number);
    const start = addMinutes(addMinutes(date, hh * 60), mm);
    const end = addMinutes(start, service.duration_minutes);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BarbeiroPro AI//EN",
      "BEGIN:VEVENT",
      `UID:${confirmed}@barbeiropro`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${service.name} — ${company.nome_fantasia || company.name}`,
      `DESCRIPTION:Profissional: ${pro.name}. Cliente: ${nome}.`,
      `LOCATION:${company.nome_fantasia || company.name}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agendamento-${service.name}.ics`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (companyQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (companyQuery.isError || companyMissing || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] text-center px-4">
        <div>
          <h1 className="text-2xl font-semibold">Barbearia não encontrada</h1>
          <p className="text-muted-foreground mt-2">
            O link parece estar incorreto ou indisponível no momento.
          </p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
            <h2 className="text-2xl font-bold mt-4">Agendamento confirmado!</h2>
            <p className="text-muted-foreground mt-2">
              {service?.name} com {pro?.name}
            </p>
            <p className="font-medium mt-1">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {time}
            </p>
            {pagamentoTipo === "clube" && membership && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-1 text-xs font-medium">
                <Crown className="w-3.5 h-3.5" /> Benefício do Clube • {membership.plano_nome} •
                saldo restante: {Math.max(0, (membership.creditos_restantes ?? 1) - 1)}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Código: {confirmed.slice(0, 8)}
            </p>
            <Button onClick={downloadICS} variant="outline" size="sm" className="mt-4">
              Adicionar ao calendário (.ics)
            </Button>

            <div className="mt-6 grid gap-2">
              <Button asChild className="w-full">
                <Link to="/cliente/agendamentos">Ver meus agendamentos</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/cliente">Minha Conta</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/">Voltar para a página inicial</Link>
              </Button>
            </div>

            {clientSession ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Redirecionando para seus agendamentos...
              </p>
            ) : (
              <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-left">
                <p className="text-sm font-medium">Crie sua conta gratuita</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Acompanhe seus horários, histórico, clube e comprovantes na Área do Cliente.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to="/cliente/entrar">Criar minha conta</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <header
        className="text-white py-8 px-4"
        style={{ backgroundColor: company.primary_color || "#1B3A4B" }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="w-12 h-12 rounded-md" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-white/15 flex items-center justify-center">
              <Scissors className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{company.nome_fantasia || company.name}</h1>
            <p className="text-sm opacity-80">Agendamento online</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
          {[1, 2, 3, 4, 5, 6].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${step >= s ? "bg-[var(--brand)] text-white" : "bg-muted"}`}
              >
                {s === 5 ? <Crown className="w-3 h-3" /> : i + 1}
              </div>
              {i < arr.length - 1 && <div className="w-4 h-px bg-muted" />}
            </div>
          ))}
        </div>


        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o serviço</CardTitle>
              <CardDescription>O que você quer fazer hoje?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {servicesQuery.data?.length ? (
                servicesQuery.data.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 rounded-md border hover:border-[var(--brand)] ${serviceId === s.id ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-border"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {s.duration_minutes} min
                        </div>
                      </div>
                      <div className="font-semibold">{formatBRL(Number(s.price))}</div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  Esta barbearia ainda não cadastrou serviços.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o profissional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {proQuery.data?.length ? (
                proQuery.data.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProId(p.id);
                      setStep(3);
                    }}
                    className={`w-full text-left p-4 rounded-md border hover:border-[var(--brand)] flex items-center gap-3 ${proId === p.id ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-border"}`}
                  >
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted" />
                    )}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.specialty && (
                        <div className="text-xs text-muted-foreground">{p.specialty}</div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum profissional disponível.</p>
              )}
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {days.map((d) => {
                  const same = d.toDateString() === date.toDateString();
                  const off = dayUnavailable(d);
                  return (
                    <button
                      key={d.toISOString()}
                      disabled={off}
                      onClick={() => {
                        setDate(d);
                        setStep(4);
                      }}
                      className={`p-3 rounded-md border text-center ${
                        off
                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
                          : same
                            ? "border-[var(--brand)] bg-[var(--brand)]/5"
                            : "border-border"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(d, "EEE", { locale: ptBR })}
                      </div>
                      <div className="font-semibold">{format(d, "dd/MM")}</div>
                      {off && <div className="text-[10px] text-muted-foreground mt-1">indisponível</div>}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep(2)}>
                ← Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o horário</CardTitle>
              <CardDescription>
                {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {slots.map((t) => {
                  const taken = unavailable.has(t);
                  return (
                    <button
                      key={t}
                      disabled={taken}
                      onClick={() => {
                        setTime(t);
                        setStep(5);
                      }}
                      className={`p-2 rounded-md border transition ${
                        taken
                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed line-through opacity-60"
                          : time === t
                            ? "border-[var(--brand)] bg-[var(--brand)]/5"
                            : "border-border hover:border-[var(--brand)]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              {busyQuery.isLoading && <p className="text-xs text-muted-foreground mt-2">Verificando horários…</p>}
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => { setIdentMode(null); setStep(3); }}>
                ← Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 5 && !clientSession && identMode === null && (
          <IdentificationStep
            onBack={() => setStep(4)}
            onAuthenticated={() => setIdentMode("auth")}
            onGuest={() => {
              setIdentMode("guest");
              setPagamentoTipo("normal");
              setChosenMembership(null);
              setStep(6);
            }}
          />
        )}

        {step === 5 && (clientSession || identMode === "auth") && companyHasClub && (
          <ClubChoiceStep
            session={clientSession}
            memberships={memberships}
            loadingMembership={!!clientSession && membershipQuery.isLoading}
            plans={clubPlans}
            loadingPlans={clubPlansQuery.isLoading}
            servicePrice={Number(service?.price ?? 0)}
            onBack={() => {
              setIdentMode(null);
              setStep(4);
            }}
            onContinue={({ useClub, membership: m }) => {
              setChosenMembership(useClub ? m : null);
              setPagamentoTipo(useClub ? "clube" : "normal");
              setStep(6);
            }}
            onSubscribe={startClubCheckout}
            subscribingPlanId={subscribingPlanId}
            defaultName={nome}
            defaultPhone={phone}
            initialView={clubInitialView}
            processingPayment={clubProcessing}
          />

        )}

        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>Seus dados</CardTitle>
              <CardDescription>Pra confirmarmos seu agendamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
                <div>
                  <Badge variant="secondary">Serviço</Badge> {service?.name} •{" "}
                  {usandoClube ? "Benefício do Clube" : service ? formatBRL(Number(service.price)) : ""}
                </div>
                <div>
                  <Badge variant="secondary">Profissional</Badge> {pro?.name}
                </div>
                <div>
                  <Badge variant="secondary">Quando</Badge>{" "}
                  {format(date, "dd/MM", { locale: ptBR })} às {time}
                </div>
              </div>

              {usandoClube && membership && (
                <div className="p-3 rounded-md border border-[var(--brand)]/30 bg-[var(--brand)]/5 text-sm flex items-start gap-2">
                  <Crown className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Benefício do Clube • {membership.plano_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      1 crédito será debitado ao confirmar ({membership.creditos_restantes}{" "}
                      disponível(is)). Se o agendamento for cancelado, o crédito volta
                      automaticamente.
                    </p>
                  </div>
                </div>
              )}



              <div>
                <Label>Seu nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div>
                <Label>Email (opcional, para receber confirmação)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIdentMode(null);
                    setStep(companyHasClub || !clientSession ? 5 : 4);
                  }}
                  disabled={submitting}
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={submit}
                  disabled={submitting || !nome || !phone}
                  className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
                >
                  {submitting ? "Confirmando..." : "Confirmar agendamento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
