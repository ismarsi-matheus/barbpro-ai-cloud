/**
 * Server Function: consulta o status de uma Checkout Session e devolve
 * o estado atual da assinatura vinculada à empresa.
 *
 * Usada pela página /dashboard/assinatura/sucesso para aguardar o
 * webhook sincronizar a subscription após o pagamento.
 *
 * Não altera nada — apenas leitura.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  sessionId: z.string().min(1),
});

export type CheckoutSessionStatus = {
  sessionStatus: string | null;
  paymentStatus: string | null;
  companyId: string | null;
  planSlug: string | null;
  subscriptionActive: boolean;
  subscriptionStatus: string | null;
  currentPlanSlug: string | null;
};

export const getCheckoutSessionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CheckoutSessionStatus> => {
    const { getStripe } = await import("./client.server");
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const companyId =
      (session.metadata?.company_id as string | undefined) ?? null;
    const planSlug =
      (session.metadata?.plan_slug as string | undefined) ?? null;

    if (!companyId) {
      return {
        sessionStatus: session.status ?? null,
        paymentStatus: session.payment_status ?? null,
        companyId: null,
        planSlug,
        subscriptionActive: false,
        subscriptionStatus: null,
        currentPlanSlug: null,
      };
    }

    // Verifica se o usuário autenticado tem acesso à empresa da sessão.
    const { data: allowed } = await context.supabase.rpc(
      "has_company_access",
      { _company_id: companyId },
    );
    if (!allowed) {
      throw new Error("Sem acesso a esta assinatura.");
    }

    const { findActiveSubscription, getCurrentPlanSlug } = await import(
      "./repository.server"
    );
    const [sub, currentPlanSlug] = await Promise.all([
      findActiveSubscription(companyId),
      getCurrentPlanSlug(companyId).catch(() => null),
    ]);

    const active = !!sub && ["trialing", "active"].includes(sub.status ?? "");

    return {
      sessionStatus: session.status ?? null,
      paymentStatus: session.payment_status ?? null,
      companyId,
      planSlug,
      subscriptionActive: active,
      subscriptionStatus: sub?.status ?? null,
      currentPlanSlug: currentPlanSlug ?? null,
    };
  });
