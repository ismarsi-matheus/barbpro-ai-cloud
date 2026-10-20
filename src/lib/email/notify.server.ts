// Server-only email dispatcher for real business events.
// Never throw to callers — email failures must not break business flows.

import { sendEmail } from "./email-service.server";
import type { TemplateName } from "./templates";

async function logEmail(row: {
  template: TemplateName;
  recipient: string;
  status: "sent" | "failed";
  provider_id?: string | null;
  error?: string | null;
  appointment_id?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("email_log").insert(row);
  } catch (e) {
    console.error("[notify] email_log insert failed", e);
  }
}

async function safeSend(
  to: string | null | undefined,
  template: TemplateName,
  data: Record<string, any>,
  appointmentId?: string,
) {
  if (!to) return { skipped: true, reason: "no-recipient" as const };
  try {
    const { id } = await sendEmail({ to, template, data });
    await logEmail({ template, recipient: to, status: "sent", provider_id: id ?? null, appointment_id: appointmentId });
    return { ok: true, id };
  } catch (e: any) {
    const error = e?.message ?? String(e);
    console.error(`[notify] ${template} failed:`, error);
    await logEmail({ template, recipient: to, status: "failed", error, appointment_id: appointmentId });
    return { ok: false, error };
  }
}

function fmtDateBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

async function loadAppointmentContext(appointmentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: a, error } = await supabaseAdmin
    .from("appointment")
    .select("id, scheduled_at, customer_id, customer_name, service_name, professional_name, service_id, professional_id, company_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error || !a) return null;

  let email: string | null = null;
  if (a.customer_id) {
    const { data: c } = await supabaseAdmin
      .from("customer")
      .select("email, name, phone")
      .eq("id", a.customer_id)
      .maybeSingle();
    email = c?.email ?? null;
    if (!a.customer_name && c?.name) (a as any).customer_name = c.name;
  }
  return { a, email };
}

export async function notifyAppointmentCreated(appointmentId: string) {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return { skipped: true, reason: "not-found" as const };
  return safeSend(ctx.email, "agendamento-confirmacao", {
    nome: ctx.a.customer_name,
    data: fmtDateBR(ctx.a.scheduled_at),
    profissional: ctx.a.professional_name,
    servico: ctx.a.service_name,
  }, ctx.a.id);
}

export async function notifyAppointmentCanceled(appointmentId: string) {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return { skipped: true, reason: "not-found" as const };
  return safeSend(ctx.email, "agendamento-cancelamento", {
    nome: ctx.a.customer_name,
    data: fmtDateBR(ctx.a.scheduled_at),
  }, ctx.a.id);
}

export async function notifyAppointmentRescheduled(
  appointmentId: string,
  oldScheduledAt: string,
) {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return { skipped: true, reason: "not-found" as const };
  return safeSend(ctx.email, "agendamento-reagendamento", {
    nome: ctx.a.customer_name,
    dataAntiga: fmtDateBR(oldScheduledAt),
    dataNova: fmtDateBR(ctx.a.scheduled_at),
  }, ctx.a.id);
}

export async function notifyAppointmentReminder(appointmentId: string) {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return { skipped: true, reason: "not-found" as const };
  return safeSend(ctx.email, "agendamento-lembrete", {
    nome: ctx.a.customer_name,
    data: fmtDateBR(ctx.a.scheduled_at),
  }, ctx.a.id);
}

// --- Signup ---
export async function notifyWelcome(email: string, nome: string) {
  return safeSend(email, "cadastro-confirmacao", { nome });
}

// --- Billing (payment / subscription) ---
async function loadCompanyContact(companyId: string): Promise<{ email: string | null; nome: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("company")
    .select("email_contato, nome_fantasia, name")
    .eq("id", companyId)
    .maybeSingle();
  return {
    email: data?.email_contato ?? null,
    nome: data?.nome_fantasia ?? data?.name ?? null,
  };
}

function formatBRL(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export async function notifyPaymentApproved(
  companyId: string,
  buyerEmail: string | null,
  amount?: number | string | null,
) {
  const c = await loadCompanyContact(companyId);
  const to = buyerEmail ?? c.email;
  return safeSend(to, "pagamento-aprovado", {
    nome: c.nome,
    valor: formatBRL(amount ?? 0),
  });
}

export async function notifyPaymentFailed(
  companyId: string,
  buyerEmail: string | null,
  motivo?: string,
) {
  const c = await loadCompanyContact(companyId);
  const to = buyerEmail ?? c.email;
  return safeSend(to, "pagamento-recusado", {
    nome: c.nome,
    motivo,
  });
}

export async function notifySubscriptionCreated(
  companyId: string,
  buyerEmail: string | null,
  plano: string,
) {
  const c = await loadCompanyContact(companyId);
  const to = buyerEmail ?? c.email;
  return safeSend(to, "assinatura-criada", {
    nome: c.nome,
    plano,
  });
}

export async function notifySubscriptionCanceled(
  companyId: string,
  buyerEmail: string | null,
) {
  const c = await loadCompanyContact(companyId);
  const to = buyerEmail ?? c.email;
  return safeSend(to, "assinatura-cancelada", {
    nome: c.nome,
  });
}
