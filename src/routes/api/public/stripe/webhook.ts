import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
} as const;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        // IMPORTANTE: usar texto cru para HMAC — não JSON.
        const rawBody = await request.text();

        try {
          const { handleStripeWebhook } = await import("@/lib/stripe/webhook-handler.server");
          const result = await handleStripeWebhook(rawBody, signature);
          return json(result.status, result.body);
        } catch (err: any) {
          return json(500, { ok: false, error: err?.message ?? "erro inesperado" });
        }
      },
    },
  },
});
