import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { NormalizedBillingEvent } from "./normalize";

type StatusMap = {
  sub: "active" | "canceled" | "past_due" | "trialing" | "paused";
  company: "ativo" | "inadimplente" | "suspenso" | "cancelado" | "trial";
};

function mapStatus(evt: NormalizedBillingEvent["eventType"]): StatusMap | null {
  switch (evt) {
    case "purchase_approved":
    case "subscription_renewed":
      return { sub: "active", company: "ativo" };
    case "subscription_canceled":
      return { sub: "canceled", company: "cancelado" };
    case "refunded":
    case "chargeback":
      return { sub: "canceled", company: "suspenso" };
    case "payment_failed":
      return { sub: "past_due", company: "inadimplente" };
    default:
      return null;
  }
}

async function findCompanyByEmail(email: string): Promise<string | null> {
  // 1) auth.users -> company_user (paginado)
  try {
    let page = 1;
    let userId: string | null = null;
    for (;;) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const u = list?.users.find((x) => (x.email ?? "").toLowerCase() === email);
      if (u) { userId = u.id; break; }
      if (!list?.users || list.users.length < 200) break;
      page += 1;
      if (page > 25) break;
    }
    if (userId) {
      const { data: cu } = await supabaseAdmin
        .from("company_user")
        .select("company_id")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cu?.company_id) return cu.company_id as string;
    }
  } catch {}

  // 2) company.email_contato
  const { data: byContact } = await supabaseAdmin
    .from("company")
    .select("id")
    .ilike("email_contato", email)
    .limit(1)
    .maybeSingle();
  if (byContact?.id) return byContact.id as string;

  return null;
}

async function findPlanByRef(ref: string | null): Promise<{ id: string; slug: string } | null> {
  if (!ref) return null;
  const { data: bySlug } = await supabaseAdmin
    .from("plan" as any)
    .select("id, slug")
    .eq("slug", ref)
    .maybeSingle();
  if (bySlug) return bySlug as any;

  const { data: byUrl } = await supabaseAdmin
    .from("plan" as any)
    .select("id, slug, checkout_url")
    .ilike("checkout_url", `%${ref}%`)
    .limit(1)
    .maybeSingle();
  if (byUrl) return byUrl as any;

  const { data: byPriceIds } = await supabaseAdmin
    .from("plan" as any)
    .select("id, slug, provider_price_ids")
    .filter("provider_price_ids", "cs", JSON.stringify({ ref }))
    .limit(1)
    .maybeSingle();
  if (byPriceIds) return byPriceIds as any;

  return null;
}

export async function applyEvent(
  evt: NormalizedBillingEvent,
  rawPayload: any,
): Promise<{ ok: boolean; retry?: boolean; error?: string; companyId?: string }> {
  const baseLog = {
    provider: evt.provider,
    event_type: evt.eventType,
    external_id: evt.externalSubscriptionId,
    buyer_email: evt.buyerEmail,
    payload: rawPayload ?? {},
  };

  if (!evt.buyerEmail) {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      processed: false,
      error: "buyer_email ausente no payload",
    });
    // ignorado, não reprocessável
    return { ok: true, error: "buyer_email ausente" };
  }

  const companyId = await findCompanyByEmail(evt.buyerEmail);
  if (!companyId) {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      processed: false,
      error: "empresa não encontrada para email " + evt.buyerEmail,
    });
    // não há o que aplicar; não pede retry
    return { ok: true, error: "empresa não encontrada" };
  }

  if (evt.eventType === "unknown") {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      matched_company_id: companyId,
      processed: true,
      error: "evento desconhecido: " + evt.rawEventName,
    });
    return { ok: true, companyId };
  }

  const status = mapStatus(evt.eventType);
  if (!status) {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      matched_company_id: companyId,
      processed: true,
    });
    return { ok: true, companyId };
  }

  const plan = await findPlanByRef(evt.productRef);

  const subPayload: any = {
    company_id: companyId,
    status: status.sub,
    provider: evt.provider,
    external_subscription_id: evt.externalSubscriptionId,
    external_customer_id: evt.externalCustomerId,
    buyer_email: evt.buyerEmail,
    metadata: { rawEventName: evt.rawEventName },
  };
  if (plan?.id) subPayload.plan_id = plan.id;
  if (evt.periodEnd) {
    const d = new Date(evt.periodEnd);
    if (!isNaN(d.getTime())) subPayload.current_period_end = d.toISOString();
  }
  if (status.sub === "canceled") subPayload.canceled_at = new Date().toISOString();

  const { error: subErr } = await supabaseAdmin
    .from("subscription" as any)
    .upsert(subPayload, { onConflict: "company_id" });
  if (subErr) {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      matched_company_id: companyId,
      processed: false,
      error: "subscription upsert: " + subErr.message,
    });
    return { ok: false, retry: true, error: subErr.message };
  }

  const companyUpdate: any = { status_cobranca: status.company };
  if (plan?.slug) companyUpdate.selected_plan_slug = plan.slug;
  const { error: cErr } = await supabaseAdmin
    .from("company")
    .update(companyUpdate)
    .eq("id", companyId);
  if (cErr) {
    await supabaseAdmin.from("billing_event_log" as any).insert({
      ...baseLog,
      matched_company_id: companyId,
      processed: false,
      error: "company update: " + cErr.message,
    });
    return { ok: false, retry: true, error: cErr.message };
  }

  await supabaseAdmin.from("billing_event_log" as any).insert({
    ...baseLog,
    matched_company_id: companyId,
    processed: true,
  });

  return { ok: true, companyId };
}

export async function getWebhookTokenForProvider(provider: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("system_settings")
    .limit(1)
    .maybeSingle();
  const tokens = (data?.system_settings as any)?.webhook_tokens ?? {};
  return tokens[provider] ?? null;
}
