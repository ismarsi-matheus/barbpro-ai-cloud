/**
 * Server Functions do Clube de Assinatura (cliente final × barbearia).
 *
 * - createClubCheckoutSession: cria a Checkout Session do Stripe (recorrente)
 *   com preço dinâmico a partir do `club_plan` da barbearia.
 * - getClubCheckoutStatus: consulta o status do pagamento e reconcilia a
 *   assinatura do Clube (fallback caso o webhook demore).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CheckoutInput = z.object({
  companyId: z.string().uuid(),
  clubPlanId: z.string().uuid(),
  slug: z.string().min(1),
  origin: z.string().url(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  returnPath: z.string().startsWith("/").max(500).optional(),
});

export type ClubCheckoutResult = { sessionId: string; url: string | null };

export const createClubCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }): Promise<ClubCheckoutResult> => {
    const { getClubPlan, ensureCustomerForUser, CLUB_METADATA_KIND } = await import(
      "./club.server"
    );

    const plan = await getClubPlan(data.clubPlanId);
    if (!plan || !plan.ativo || plan.company_id !== data.companyId) {
      throw new Error("Plano do Clube indisponível.");
    }
    if (plan.preco_cents <= 0) {
      throw new Error("Este plano não possui preço configurado para pagamento online.");
    }

    const userId = context.userId as string;
    const { data: userInfo } = await context.supabase.auth.getUser();
    const email = userInfo?.user?.email ?? null;

    const customerId = await ensureCustomerForUser({
      companyId: data.companyId,
      userId,
      name: data.name,
      phone: data.phone,
      email,
    });

    const metadata: Record<string, string> = {
      kind: CLUB_METADATA_KIND,
      company_id: data.companyId,
      club_plan_id: plan.id,
      customer_id: customerId,
      user_id: userId,
      creditos_mensais: String(plan.creditos_mensais ?? 0),
      slug: data.slug,
    };

    const { getStripe } = await import("@/lib/stripe/client.server");
    const stripe = getStripe();

    const origin = data.origin.replace(/\/+$/, "");
    const base = data.returnPath ?? `/agendar/${data.slug}`;
    const joiner = base.includes("?") ? "&" : "?";
    const successUrl = `${origin}${base}${joiner}club_session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${base}${joiner}club_cancel=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: plan.preco_cents,
            recurring: { interval: "month" },
            product_data: {
              name: `Clube — ${plan.nome}`,
              ...(Array.isArray(plan.beneficios) && plan.beneficios.length
                ? { description: (plan.beneficios as string[]).slice(0, 3).join(" • ") }
                : {}),
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
      metadata,
      subscription_data: { metadata },
    } as any);

    return { sessionId: session.id, url: session.url };
  });

const StatusInput = z.object({ sessionId: z.string().min(1) });

export type ClubCheckoutStatus = {
  paid: boolean;
  sessionStatus: string | null;
  paymentStatus: string | null;
  membershipActive: boolean;
  membershipId: string | null;
  companyId: string | null;
  clubPlanId: string | null;
};

export const getClubCheckoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data, context }): Promise<ClubCheckoutStatus> => {
    const { getStripe } = await import("@/lib/stripe/client.server");
    const { syncClubMembershipFromSubscription } = await import("./club.server");

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const meta = (session.metadata ?? {}) as Record<string, string>;

    // Só o próprio dono da sessão pode consultá-la.
    if (meta["user_id"] && meta["user_id"] !== context.userId) {
      throw new Error("Sessão de pagamento não pertence a este usuário.");
    }

    const paid = session.payment_status === "paid" || session.status === "complete";
    let membershipActive = false;
    let membershipId: string | null = null;

    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (paid && subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const res = await syncClubMembershipFromSubscription(sub as any);
      membershipId = res.membershipId;
      membershipActive = res.status === "ativo";
    }

    return {
      paid,
      sessionStatus: session.status ?? null,
      paymentStatus: session.payment_status ?? null,
      membershipActive,
      membershipId,
      companyId: meta["company_id"] ?? null,
      clubPlanId: meta["club_plan_id"] ?? null,
    };
  });

/**
 * Portal de cobrança do Clube (upgrade, downgrade, troca de cartão e cancelamento).
 * Só devolve a URL se a assinatura pertencer ao cliente autenticado.
 */
export const createClubBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ clubMemberId: z.string().uuid(), returnUrl: z.string().url() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    // Ownership: a RPC só devolve as assinaturas do usuário autenticado.
    const { data: mine, error } = await context.supabase.rpc("get_my_club_memberships", {
      _company_id: null as unknown as string,
    });
    if (error) throw new Error(error.message);
    if (!(mine ?? []).some((m: { id: string }) => m.id === data.clubMemberId)) {
      throw new Error("Assinatura não encontrada.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await (supabaseAdmin as any)
      .from("club_member")
      .select("stripe_customer_id")
      .eq("id", data.clubMemberId)
      .maybeSingle();

    if (!member?.stripe_customer_id) {
      throw new Error("Esta assinatura não possui cobrança online. Fale com a barbearia.");
    }

    const { getStripe } = await import("@/lib/stripe/client.server");
    const session = await getStripe().billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: data.returnUrl,
    });
    return { url: session.url };
  });
