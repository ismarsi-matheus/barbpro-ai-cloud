/**
 * Cliente Stripe server-side.
 *
 * NUNCA importe este arquivo em código de cliente. O nome `.server.ts`
 * é enforçado pela cadeia de build do TanStack Start.
 */
import Stripe from "stripe";
import { STRIPE_API_VERSION, readStripeServerConfig } from "./config";

let cached: Stripe | null = null;

/**
 * Retorna a instância do Stripe SDK. Lança se STRIPE_SECRET_KEY não estiver
 * configurada — deve ser chamada apenas dentro de handlers que exijam Stripe.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const { secretKey } = readStripeServerConfig();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Configure a chave secreta antes de usar o Stripe.",
    );
  }
  cached = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION as any,
    typescript: true,
    appInfo: {
      name: "BarbeiroPro AI",
      version: "1.0.0",
    },
  });
  return cached;
}

/** Retorna o cliente Stripe ou null se ainda não configurado (uso opcional). */
export function tryGetStripe(): Stripe | null {
  try {
    return getStripe();
  } catch {
    return null;
  }
}
