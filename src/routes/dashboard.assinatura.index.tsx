import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Alias para o cancel_url do Stripe Checkout. Redireciona para a
 * página real de checkout/planos do app.
 */
export const Route = createFileRoute("/dashboard/assinatura/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/checkout" });
  },
});
