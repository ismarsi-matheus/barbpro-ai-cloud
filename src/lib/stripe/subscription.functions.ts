/**
 * Server Functions expostas para o cliente (leitura autorizada).
 *
 * Nenhuma destas funções cria checkout ou faz cobrança — apenas leem estado
 * persistido de Stripe / subscription.
 *
 * As gravações (sync, upserts) NUNCA são expostas ao cliente: acontecem
 * exclusivamente no fluxo de webhook (server-only).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  StripeCustomerRow,
  SubscriptionRow,
} from "./db-types";

async function assertCompanyAccess(ctx: any, companyId: string) {
  const { data, error } = await ctx.supabase.rpc("has_company_access", {
    _company_id: companyId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sem acesso a esta empresa.");
}

export const getSubscriptionForCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyAccess(context, data.companyId);
    const { findActiveSubscription, findStripeCustomerByCompany } = await import(
      "./repository.server"
    );
    const [subscription, customer] = await Promise.all([
      findActiveSubscription(data.companyId),
      findStripeCustomerByCompany(data.companyId),
    ]);
    return {
      subscription: (subscription ?? null) as any,
      customer: (customer ?? null) as any,
    };
  });

export const getCurrentPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyAccess(context, data.companyId);
    const { getCurrentPlanSlug } = await import("./repository.server");
    const slug = await getCurrentPlanSlug(data.companyId);
    return { planSlug: slug };
  });
