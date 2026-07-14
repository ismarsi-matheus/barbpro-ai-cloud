/**
 * Configuração central do Stripe (leitura de env vars).
 *
 * Todas as variáveis são opcionais neste momento: a etapa atual apenas
 * prepara a infraestrutura. As chaves reais serão configuradas no
 * momento em que o checkout for implementado.
 *
 * Variáveis esperadas (server-side, via Lovable Cloud secrets):
 *   - STRIPE_SECRET_KEY           → sk_live_... ou sk_test_...
 *   - STRIPE_WEBHOOK_SECRET       → whsec_...
 *   - STRIPE_PRODUCT_STARTER      → prod_...
 *   - STRIPE_PRODUCT_PRO          → prod_...
 *   - STRIPE_PRODUCT_ELITE        → prod_...
 *   - STRIPE_PRICE_STARTER        → price_...
 *   - STRIPE_PRICE_PRO            → price_...
 *   - STRIPE_PRICE_ELITE          → price_...
 *   - STRIPE_PORTAL_RETURN_URL    → https://.../app/configuracoes
 *   - STRIPE_CHECKOUT_SUCCESS_URL → https://.../app/checkout/sucesso
 *   - STRIPE_CHECKOUT_CANCEL_URL  → https://.../app/checkout
 *
 * Variável pública (client-side, opcional para Stripe.js):
 *   - VITE_STRIPE_PUBLISHABLE_KEY → pk_live_... ou pk_test_...
 */

export const STRIPE_API_VERSION = "2024-06-20" as const;

export interface StripeServerConfig {
  secretKey: string | null;
  webhookSecret: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  portalReturnUrl: string | null;
}

export function readStripeServerConfig(): StripeServerConfig {
  const env = (name: string): string | null => {
    const v = typeof process !== "undefined" ? process.env?.[name] : undefined;
    return v && v.length > 0 ? v : null;
  };
  return {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
    successUrl: env("STRIPE_CHECKOUT_SUCCESS_URL"),
    cancelUrl: env("STRIPE_CHECKOUT_CANCEL_URL"),
    portalReturnUrl: env("STRIPE_PORTAL_RETURN_URL"),
  };
}

export function isStripeConfigured(): boolean {
  return !!readStripeServerConfig().secretKey;
}

export function readPublishableKey(): string | null {
  const v = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  return v && v.length > 0 ? v : null;
}
