/**
 * Server Functions da Central de Assinatura.
 *
 * `getCurrentSubscription` é a ÚNICA fonte de verdade de plano e permissões
 * do app. Nenhuma tela deve ler `company.plano` diretamente.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSnapshot, type SubscriptionSnapshot } from "./subscription-core";

const CompanyInput = z.object({ companyId: z.string().uuid() });

async function assertAccess(ctx: any, companyId: string) {
  const { data, error } = await ctx.supabase.rpc("has_company_access", {
    _company_id: companyId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sem acesso a esta empresa.");
}

export type SubscriptionInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaidCents: number;
  currency: string;
  created: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
};

export type SubscriptionPayload = {
  snapshot: SubscriptionSnapshot;
  invoices: SubscriptionInvoice[];
  hasBillingPortal: boolean;
};

export const getCurrentSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompanyInput.parse(input))
  .handler(async ({ data, context }): Promise<SubscriptionPayload> => {
    await assertAccess(context, data.companyId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [companyRes, subRes, custRes] = await Promise.all([
      admin.from("company").select("*").eq("id", data.companyId).maybeSingle(),
      admin
        .from("subscription")
        .select("*")
        .eq("company_id", data.companyId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("stripe_customer")
        .select("*")
        .eq("company_id", data.companyId)
        .maybeSingle(),
    ]);

    const company = companyRes.data ?? null;
    const subscription = subRes.data ?? null;
    const stripeCustomerId =
      (custRes.data?.stripe_customer_id as string | undefined) ?? null;

    let paymentMethod: { brand: string | null; last4: string | null } | null = null;
    let invoices: SubscriptionInvoice[] = [];
    let hasBillingPortal = false;

    if (stripeCustomerId) {
      try {
        const { tryGetStripe } = await import("@/lib/stripe/client.server");
        const stripe = tryGetStripe();
        if (stripe) {
          hasBillingPortal = true;
          if (subscription?.external_subscription_id) {
            try {
              const s = await stripe.subscriptions.retrieve(
                subscription.external_subscription_id as string,
                { expand: ["default_payment_method"] },
              );
              const pm: any = (s as any).default_payment_method;
              if (pm && typeof pm === "object" && pm.card) {
                paymentMethod = { brand: pm.card.brand ?? null, last4: pm.card.last4 ?? null };
              }
            } catch {
              /* assinatura pode não existir mais no Stripe — ignora */
            }
          }
          try {
            const list = await stripe.invoices.list({
              customer: stripeCustomerId,
              limit: 12,
            });
            invoices = list.data.map((inv) => ({
              id: inv.id ?? "",
              number: inv.number ?? null,
              status: inv.status ?? null,
              amountPaidCents: inv.amount_paid ?? 0,
              currency: inv.currency ?? "brl",
              created: new Date((inv.created ?? 0) * 1000).toISOString(),
              hostedUrl: inv.hosted_invoice_url ?? null,
              pdfUrl: inv.invoice_pdf ?? null,
            }));
          } catch {
            /* faturas indisponíveis — não bloqueia a página */
          }
        }
      } catch {
        /* Stripe não configurado — segue com dados do banco */
      }
    }

    return {
      snapshot: buildSnapshot({
        companyId: data.companyId,
        company,
        subscription,
        stripeCustomerId,
        paymentMethod,
      }),
      invoices,
      hasBillingPortal,
    };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    CompanyInput.extend({ returnUrl: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    await assertAccess(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await (supabaseAdmin as any)
      .from("stripe_customer")
      .select("stripe_customer_id")
      .eq("company_id", data.companyId)
      .maybeSingle();

    if (!cust?.stripe_customer_id) {
      throw new Error("Nenhum cadastro de cobrança encontrado para esta empresa.");
    }

    const { getStripe } = await import("@/lib/stripe/client.server");
    const session = await getStripe().billingPortal.sessions.create({
      customer: cust.stripe_customer_id as string,
      return_url: data.returnUrl,
    });
    return { url: session.url };
  });

/** Cancela a assinatura ao final do período vigente (sem perda imediata de acesso). */
export const cancelSubscriptionAtPeriodEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    CompanyInput.extend({ reactivate: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; cancelAtPeriodEnd: boolean }> => {
    await assertAccess(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: sub } = await admin
      .from("subscription")
      .select("external_subscription_id")
      .eq("company_id", data.companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.external_subscription_id) {
      throw new Error("Nenhuma assinatura ativa encontrada para cancelar.");
    }

    const cancel = !data.reactivate;
    const { getStripe } = await import("@/lib/stripe/client.server");
    await getStripe().subscriptions.update(sub.external_subscription_id as string, {
      cancel_at_period_end: cancel,
    });

    await admin
      .from("subscription")
      .update({ cancel_at_period_end: cancel, updated_at: new Date().toISOString() })
      .eq("external_subscription_id", sub.external_subscription_id);

    return { ok: true, cancelAtPeriodEnd: cancel };
  });
