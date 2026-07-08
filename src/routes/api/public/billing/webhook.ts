import { createFileRoute } from "@tanstack/react-router";
import { normalize, type BillingProvider } from "@/lib/billing/normalize";

const ALLOWED: BillingProvider[] = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-token",
} as const;

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function readBody(request: Request): Promise<Record<string, any>> {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return await request.json(); } catch { return {}; }
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const obj: Record<string, any> = {};
      for (const [k, v] of form.entries()) {
        // try parse json values for keys like "data"
        if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
          try { obj[k] = JSON.parse(v); continue; } catch {}
        }
        obj[k] = v;
      }
      return obj;
    } catch { return {}; }
  }
  // fallback: try json then text
  try {
    const text = await request.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { _raw: text }; }
  } catch { return {}; }
}

export const Route = createFileRoute("/api/public/billing/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = (url.searchParams.get("provider") || "").toLowerCase() as BillingProvider;
        const tokenQ = url.searchParams.get("token") || "";
        const tokenH = request.headers.get("x-webhook-token") || "";
        const token = tokenQ || tokenH;

        if (!ALLOWED.includes(provider)) {
          return json(400, { ok: false, error: "provider inválido" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyEvent, getWebhookTokenForProvider } = await import("@/lib/billing/apply.server");

        const expected = await getWebhookTokenForProvider(provider);
        if (!expected || !token || token !== expected) {
          // Log e responde 200 mas com ok:false
          await supabaseAdmin.from("billing_event_log" as any).insert({
            provider,
            event_type: "auth_failed",
            processed: false,
            error: "token inválido",
            payload: {},
          });
          return json(401, { ok: false, error: "token inválido" });
        }

        const body = await readBody(request);

        try {
          const evt = normalize(provider, body);
          const result = await applyEvent(evt, body);
          if (!result.ok && result.retry) {
            // Erro de gravação no banco => 500 para o provedor reenviar
            return json(500, { ok: false, eventType: evt.eventType, error: result.error });
          }
          return json(200, { ok: result.ok, eventType: evt.eventType, error: result.error });
        } catch (err: any) {
          // Erro de parsing/normalização => 200 (não tem como reprocessar)
          await supabaseAdmin.from("billing_event_log" as any).insert({
            provider,
            event_type: "exception",
            processed: false,
            error: err?.message ?? String(err),
            payload: body ?? {},
          });
          return json(200, { ok: false, error: err?.message ?? "erro interno" });
        }
      },
    },
  },
});
