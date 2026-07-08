import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROVIDERS = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"] as const;
type Provider = (typeof PROVIDERS)[number];

function randomToken(len = 24): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function assertSuperAdmin(ctx: any) {
  const { data: isAdmin, error } = await ctx.supabase.rpc("is_super_admin");
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Apenas super admin.");
}

async function loadOrInitConfig() {
  const { data: existing } = await supabaseAdmin
    .from("app_config")
    .select("id, system_settings")
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing;
  const { data: created } = await supabaseAdmin
    .from("app_config")
    .insert({ app_name: "BarbeiroPro AI", super_admin_emails: [], system_settings: {} })
    .select("id, system_settings")
    .single();
  return created!;
}

async function ensureTokens(): Promise<Record<Provider, string>> {
  const cfg = await loadOrInitConfig();
  const settings = (cfg.system_settings as any) ?? {};
  const current = (settings.webhook_tokens as any) ?? {};
  let changed = false;
  const out: Record<string, string> = { ...current };
  for (const p of PROVIDERS) {
    if (!out[p]) {
      out[p] = randomToken(24);
      changed = true;
    }
  }
  if (changed) {
    await supabaseAdmin
      .from("app_config")
      .update({ system_settings: { ...settings, webhook_tokens: out } })
      .eq("id", cfg.id);
  }
  return out as Record<Provider, string>;
}

export const getBillingWebhookInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const tokens = await ensureTokens();
    const baseUrl = process.env.PUBLIC_APP_URL || "";
    return { baseUrl, tokens };
  });

export const regenerateWebhookToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: z.enum(PROVIDERS) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const cfg = await loadOrInitConfig();
    const settings = (cfg.system_settings as any) ?? {};
    const current = (settings.webhook_tokens as any) ?? {};
    const next = randomToken(24);
    current[data.provider] = next;
    await supabaseAdmin
      .from("app_config")
      .update({ system_settings: { ...settings, webhook_tokens: current } })
      .eq("id", cfg.id);
    return { provider: data.provider, token: next };
  });

export const listBillingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await supabaseAdmin
      .from("billing_event_log" as any)
      .select("id, provider, event_type, buyer_email, matched_company_id, processed, error, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return { events: data ?? [] };
  });
