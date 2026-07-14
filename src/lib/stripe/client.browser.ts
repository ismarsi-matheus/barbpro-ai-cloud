/**
 * Cliente Stripe.js (browser). Usado apenas para redirects a Checkout ou
 * componentes de Elements — não expõe segredos.
 */
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { readPublishableKey } from "./config";

let promise: Promise<StripeJs | null> | null = null;

export function getStripeBrowser(): Promise<StripeJs | null> {
  if (promise) return promise;
  const pk = readPublishableKey();
  if (!pk) {
    promise = Promise.resolve(null);
    return promise;
  }
  promise = loadStripe(pk);
  return promise;
}
