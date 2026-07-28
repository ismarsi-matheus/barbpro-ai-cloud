/**
 * Server Function: cria uma Checkout Session do Stripe (modo subscription).
 *
 * Fluxo:
 *   1. Valida o usuário autenticado e sua permissão sobre a empresa.
 *   2. Resolve o STRIPE_PRICE_* pelo slug do plano (starter/pro/elite).
 *   3. Reutiliza o stripe_customer_id salvo se já existir; caso contrário,
 *      envia customer_email e deixa o Stripe criar o customer.
 *   4. Devolve a URL do Checkout para o cliente redirecionar.
 *
 * Não altera webhook, tabelas ou lógica de sincronização.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_SLUGS } from "./plans";

const InputSchema = z.object({
  companyId: z.string().uuid(),
  planSlug: z.enum(PLAN_SLUGS as [string, ...string[]]),
  origin: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Autorização — o usuário precisa ter acesso à empresa.
    const { data: allowed, error: rpcErr } = await context.supabase.rpc(
      "has_company_access",
      { _company_id: data.companyId },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    if (!allowed) throw new Error("Sem acesso a esta empresa.");

    const { PLANS } = await import("./plans");
    const plan = PLANS[data.planSlug as keyof typeof PLANS];
    const priceId = plan.stripePriceId;
    if (!priceId) {
      throw new Error(
        `STRIPE_PRICE do plano "${data.planSlug}" não configurado no ambiente.`,
      );
    }

    // 2. Stripe SDK (lazy — só carrega no handler).
    const { getStripe } = await import("./client.server");
    const { findStripeCustomerByCompany, upsertStripeCustomer } = await import(
      "./repository.server"
    );
    const { buildStripeMetadata } = await import("./helpers");

    const stripe = getStripe();

    // 3. Recupera stripe_customer existente OU permite ao Stripe criar.
    const existing = await findStripeCustomerByCompany(data.companyId);
    let email: string | null = existing?.email ?? null;
    if (!email) {
      const { data: userInfo } = await context.supabase.auth.getUser();
      email = userInfo?.user?.email ?? null;
    }

    const metadata = buildStripeMetadata({
      companyId: data.companyId,
      planSlug: data.planSlug as any,
      userId: context.userId ?? null,
    });

    const origin = data.origin.replace(/\/+$/, "");
    const successUrl = `${origin}/dashboard/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard/assinatura`;

    const sessionParams: any = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata,
      subscription_data: {
        metadata,
      },
    };

    if (existing?.stripe_customer_id) {
      sessionParams.customer = existing.stripe_customer_id;
      sessionParams.customer_update = { address: "auto", name: "auto" };
    } else if (email) {
      // Em mode=subscription o Stripe sempre cria um Customer;
      // `customer_creation` só é válido em mode=payment.
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // 4. Persistência otimista do stripe_customer quando o Stripe já criar
    //    de forma síncrona (o webhook customer.created também garante).
    if (!existing?.stripe_customer_id) {
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      if (customerId) {
        try {
          await upsertStripeCustomer({
            companyId: data.companyId,
            stripeCustomerId: customerId,
            email,
            metadata: { source: "checkout.session.create" },
          });
        } catch {
          /* webhook cobre — não falhar o checkout por isso */
        }
      }
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  });
