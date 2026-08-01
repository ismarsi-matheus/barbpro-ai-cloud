/**
 * Lógica server-only do Clube de Assinatura (por barbearia).
 *
 * O Clube NÃO usa a tabela `subscription` (essa é a assinatura SaaS da
 * barbearia no BarbeiroPro). Aqui gravamos em `club_member`, que é a
 * assinatura do CLIENTE FINAL dentro de uma barbearia.
 *
 * Nunca importar em código de cliente — arquivo `.server.ts`.
 */
import type Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const admin = () => supabaseAdmin as unknown as any;

export const CLUB_METADATA_KIND = "club_membership";

export type ClubCheckoutMetadata = {
  kind: string;
  company_id: string;
  club_plan_id: string;
  customer_id: string;
  user_id: string;
  creditos_mensais: string;
  slug: string;
};

export function isClubMetadata(meta: Stripe.Metadata | null | undefined): boolean {
  return (meta?.["kind"] as string | undefined) === CLUB_METADATA_KIND;
}

export type ClubPlanRow = {
  id: string;
  company_id: string;
  nome: string;
  preco_cents: number;
  creditos_mensais: number;
  ativo: boolean;
  beneficios: unknown;
};

export async function getClubPlan(clubPlanId: string): Promise<ClubPlanRow | null> {
  const { data, error } = await admin()
    .from("club_plan")
    .select("id,company_id,nome,preco_cents,creditos_mensais,ativo,beneficios")
    .eq("id", clubPlanId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClubPlanRow | null) ?? null;
}

export async function getCompanyBySlugOrId(input: {
  companyId?: string | null;
  slug?: string | null;
}): Promise<{ id: string; slug: string | null; name: string; nome_fantasia: string | null } | null> {
  let q = admin().from("company").select("id,slug,name,nome_fantasia");
  if (input.companyId) q = q.eq("id", input.companyId);
  else if (input.slug) q = q.eq("slug", input.slug);
  else return null;
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Garante que exista uma linha em `customer` para o usuário logado nesta
 * barbearia (o Clube é sempre vinculado a um cliente da barbearia).
 */
export async function ensureCustomerForUser(input: {
  companyId: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
}): Promise<string> {
  const byUser = await admin()
    .from("customer")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (byUser.error) throw byUser.error;
  if (byUser.data?.id) {
    await admin()
      .from("customer")
      .update({
        name: input.name || undefined,
        phone: input.phone || undefined,
        email: input.email ?? undefined,
      })
      .eq("id", byUser.data.id);
    return byUser.data.id as string;
  }

  if (input.phone) {
    const byPhone = await admin()
      .from("customer")
      .select("id")
      .eq("company_id", input.companyId)
      .eq("phone", input.phone)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (byPhone.error) throw byPhone.error;
    if (byPhone.data?.id) {
      await admin()
        .from("customer")
        .update({ user_id: input.userId, name: input.name || undefined, email: input.email ?? undefined })
        .eq("id", byPhone.data.id);
      return byPhone.data.id as string;
    }
  }

  const { data, error } = await admin()
    .from("customer")
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      name: input.name || "Cliente",
      phone: input.phone,
      email: input.email,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

function isoOrNull(sec: number | null | undefined): string | null {
  return typeof sec === "number" ? new Date(sec * 1000).toISOString() : null;
}

/**
 * Cria/atualiza a assinatura do Clube a partir de uma Subscription do Stripe.
 * Idempotente: pode ser chamada pelo webhook e pelo polling da tela.
 */
export async function syncClubMembershipFromSubscription(
  sub: Stripe.Subscription,
): Promise<{ membershipId: string | null; status: string }> {
  const meta = (sub.metadata ?? {}) as Record<string, string>;
  if (!isClubMetadata(meta as any)) return { membershipId: null, status: "ignored" };

  const companyId = meta["company_id"];
  const clubPlanId = meta["club_plan_id"];
  const customerId = meta["customer_id"];
  if (!companyId || !clubPlanId || !customerId) {
    return { membershipId: null, status: "metadata_incompleta" };
  }

  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const active = ["active", "trialing"].includes(sub.status);
  const item = sub.items?.data?.[0] as any;
  const periodEnd =
    isoOrNull((sub as any).current_period_end) ?? isoOrNull(item?.current_period_end);
  const periodStart =
    isoOrNull((sub as any).current_period_start) ?? isoOrNull(item?.current_period_start);

  const plan = await getClubPlan(clubPlanId);
  const creditos = plan?.creditos_mensais ?? Number(meta["creditos_mensais"] ?? 0) ?? 0;

  const existing = await admin()
    .from("club_member")
    .select("id,creditos_restantes,current_period_start,status")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const renewed =
      !!periodStart && existing.data.current_period_start !== periodStart && active;
    const patch: Record<string, unknown> = {
      status: active ? "ativo" : "cancelado",
      current_period_end: periodEnd,
      current_period_start: periodStart,
      club_plan_id: clubPlanId,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    };
    if (renewed) patch["creditos_restantes"] = creditos;
    const { error } = await admin().from("club_member").update(patch).eq("id", existing.data.id);
    if (error) throw error;
    return { membershipId: existing.data.id as string, status: active ? "ativo" : "cancelado" };
  }

  // Reaproveita membership já existente do mesmo cliente/plano (sem stripe ainda).
  const prev = await admin()
    .from("club_member")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .is("stripe_subscription_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prev.error) throw prev.error;

  const payload = {
    company_id: companyId,
    customer_id: customerId,
    club_plan_id: clubPlanId,
    status: active ? "ativo" : "cancelado",
    creditos_restantes: active ? creditos : 0,
    current_period_end: periodEnd,
    current_period_start: periodStart,
    stripe_subscription_id: sub.id,
    stripe_customer_id: stripeCustomerId,
    updated_at: new Date().toISOString(),
  };

  if (prev.data?.id) {
    const { error } = await admin().from("club_member").update(payload).eq("id", prev.data.id);
    if (error) throw error;
    return { membershipId: prev.data.id as string, status: payload.status };
  }

  const { data, error } = await admin()
    .from("club_member")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;

  await registerClubPayment({
    userIdMeta: meta["user_id"] ?? null,
    companyId,
    clubMemberId: data.id as string,
    amountCents: plan?.preco_cents ?? 0,
    descricao: `Clube — ${plan?.nome ?? "Assinatura"}`,
  });

  return { membershipId: data.id as string, status: payload.status };
}

export async function cancelClubMembershipBySubscription(subscriptionId: string): Promise<boolean> {
  const { data, error } = await admin()
    .from("club_member")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function registerClubPayment(input: {
  userIdMeta: string | null;
  companyId: string;
  clubMemberId: string;
  amountCents: number;
  descricao: string;
}): Promise<void> {
  if (!input.userIdMeta) return;
  try {
    await admin().from("client_payment").insert({
      user_id: input.userIdMeta,
      company_id: input.companyId,
      club_member_id: input.clubMemberId,
      descricao: input.descricao,
      amount_cents: input.amountCents,
      status: "pago",
      metodo: "stripe",
      paid_at: new Date().toISOString(),
    });
  } catch {
    /* histórico de pagamento é acessório — não bloqueia a ativação */
  }
}
