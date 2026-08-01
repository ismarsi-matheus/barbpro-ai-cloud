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

export type ProvisionResult = {
  membershipId: string | null;
  status: string;
  saldo: number;
  utilizados: number;
  creditosMensais: number;
  renovacao: string | null;
};

const IGNORED: ProvisionResult = {
  membershipId: null,
  status: "ignored",
  saldo: 0,
  utilizados: 0,
  creditosMensais: 0,
  renovacao: null,
};

/**
 * Fonte ÚNICA de provisionamento de benefícios do Clube.
 *
 * Chamada por: checkout.session.completed, customer.subscription.created/updated,
 * customer.subscription.deleted, invoice.paid e pelo polling da tela.
 *
 * Regras:
 *  - Assinatura nova/ativa      → saldo = créditos do plano, utilizados = 0.
 *  - Renovação (novo período)   → recarrega saldo e zera utilizados.
 *  - Upgrade/downgrade de plano → recalcula saldo = créditos novos - utilizados.
 *  - Cancelamento               → benefícios permanecem até o fim do período pago.
 *  - Período expirado           → saldo = 0, status = expirado.
 *  - Idempotente: a recarga só acontece quando `current_period_start` muda
 *    (guardado em `last_provisioned_period`), então webhooks duplicados/reenviados
 *    nunca geram créditos extras.
 */
export async function provisionClubBenefits(sub: Stripe.Subscription): Promise<ProvisionResult> {
  const meta = (sub.metadata ?? {}) as Record<string, string>;
  if (!isClubMetadata(meta as any)) return IGNORED;

  const companyId = meta["company_id"];
  const clubPlanId = meta["club_plan_id"];
  const customerId = meta["customer_id"];
  if (!companyId || !clubPlanId || !customerId) {
    return { ...IGNORED, status: "metadata_incompleta" };
  }

  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const item = sub.items?.data?.[0] as any;
  const periodEnd = isoOrNull((sub as any).current_period_end) ?? isoOrNull(item?.current_period_end);
  const periodStart =
    isoOrNull((sub as any).current_period_start) ?? isoOrNull(item?.current_period_start);

  const plan = await getClubPlan(clubPlanId);
  const creditos = Math.max(
    0,
    Number(plan?.creditos_mensais ?? meta["creditos_mensais"] ?? 0) || 0,
  );

  const periodoVigente = !periodEnd || new Date(periodEnd).getTime() > Date.now();
  const stripeAtiva = ["active", "trialing", "past_due"].includes(sub.status);
  // Cancelada mas dentro do período pago → benefícios continuam válidos.
  const ativo = periodoVigente && (stripeAtiva || sub.status === "canceled");
  const status = ativo ? "ativo" : periodoVigente ? "cancelado" : "expirado";
  const cancelAtPeriodEnd = !!sub.cancel_at_period_end || sub.status === "canceled";

  const existing = await admin()
    .from("club_member")
    .select(
      "id,creditos_restantes,beneficios_utilizados,current_period_start,last_provisioned_period,club_plan_id,status",
    )
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  const base = {
    status,
    club_plan_id: clubPlanId,
    current_period_end: periodEnd,
    current_period_start: periodStart,
    cancel_at_period_end: cancelAtPeriodEnd,
    stripe_customer_id: stripeCustomerId,
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;

  if (existing.data) {
    const row = existing.data as any;
    const utilizados = Math.max(0, Number(row.beneficios_utilizados ?? 0));
    let saldo = Math.max(0, Number(row.creditos_restantes ?? 0));
    let novoUtilizados = utilizados;

    // Idempotência: recarrega apenas uma vez por período de cobrança.
    const jaProvisionado =
      !!row.last_provisioned_period &&
      !!periodStart &&
      new Date(row.last_provisioned_period).getTime() === new Date(periodStart).getTime();

    if (status === "expirado") {
      saldo = 0;
    } else if (!jaProvisionado) {
      // Novo período (assinatura nova ou renovação mensal).
      saldo = creditos;
      novoUtilizados = 0;
      base["last_provisioned_period"] = periodStart;
    } else if (row.club_plan_id !== clubPlanId) {
      // Upgrade/downgrade dentro do mesmo período.
      saldo = Math.max(0, creditos - utilizados);
    }

    base["creditos_restantes"] = saldo;
    base["beneficios_utilizados"] = novoUtilizados;

    const { error } = await admin().from("club_member").update(base).eq("id", row.id);
    if (error) throw error;
    return {
      membershipId: row.id as string,
      status,
      saldo,
      utilizados: novoUtilizados,
      creditosMensais: creditos,
      renovacao: periodEnd,
    };
  }

  // Reaproveita membership já existente do mesmo cliente (sem stripe ainda).
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

  const saldoInicial = status === "expirado" ? 0 : creditos;
  const payload = {
    ...base,
    company_id: companyId,
    customer_id: customerId,
    creditos_restantes: saldoInicial,
    beneficios_utilizados: 0,
    last_provisioned_period: periodStart,
    stripe_subscription_id: sub.id,
  };

  if (prev.data?.id) {
    const { error } = await admin().from("club_member").update(payload).eq("id", prev.data.id);
    if (error) throw error;
    return {
      membershipId: prev.data.id as string,
      status,
      saldo: saldoInicial,
      utilizados: 0,
      creditosMensais: creditos,
      renovacao: periodEnd,
    };
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

  return {
    membershipId: data.id as string,
    status,
    saldo: saldoInicial,
    utilizados: 0,
    creditosMensais: creditos,
    renovacao: periodEnd,
  };
}

/** Alias histórico — todo o fluxo passa por `provisionClubBenefits`. */
export const syncClubMembershipFromSubscription = provisionClubBenefits;

/**
 * Cancelamento no Stripe: NÃO remove benefícios imediatamente. Eles seguem
 * válidos até o fim do período pago; depois disso a assinatura expira.
 */
export async function cancelClubMembershipBySubscription(subscriptionId: string): Promise<boolean> {
  const found = await admin()
    .from("club_member")
    .select("id,current_period_end")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) return false;

  const end = found.data.current_period_end as string | null;
  const vigente = !!end && new Date(end).getTime() > Date.now();

  const patch: Record<string, unknown> = {
    cancel_at_period_end: true,
    updated_at: new Date().toISOString(),
  };
  if (vigente) {
    patch["status"] = "ativo"; // benefícios permanecem até o fim do período
  } else {
    patch["status"] = "expirado";
    patch["creditos_restantes"] = 0;
  }

  const { error } = await admin().from("club_member").update(patch).eq("id", found.data.id);
  if (error) throw error;
  return true;
}

/**
 * Expira assinaturas cujo período pago já terminou (saldo zerado).
 * Idempotente — pode rodar quantas vezes for necessário.
 */
export async function expireEndedClubMemberships(): Promise<number> {
  const { data, error } = await admin()
    .from("club_member")
    .update({ status: "expirado", creditos_restantes: 0, updated_at: new Date().toISOString() })
    .eq("cancel_at_period_end", true)
    .in("status", ["ativo", "cancelado"])
    .lt("current_period_end", new Date().toISOString())
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
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
