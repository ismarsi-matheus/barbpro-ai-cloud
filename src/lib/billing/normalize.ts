export type BillingEventType =
  | "purchase_approved"
  | "subscription_renewed"
  | "subscription_canceled"
  | "payment_failed"
  | "chargeback"
  | "refunded"
  | "unknown";

export type BillingProvider = "kiwify" | "cakto" | "perfectpay" | "hotmart" | "kirvano";

export interface NormalizedBillingEvent {
  provider: BillingProvider;
  eventType: BillingEventType;
  rawEventName: string;
  buyerEmail: string | null;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  productRef: string | null;
  amountCents: number | null;
  periodEnd: string | null;
}

function pick(...vals: any[]): any {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}
function lower(v: any): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return t || null;
}
function digits(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (isNaN(n)) return null;
  return Math.round(n);
}

function detectKiwify(name: string): BillingEventType {
  const n = name.toLowerCase();
  if (/refund/.test(n)) return "refunded";
  if (/chargeback/.test(n)) return "chargeback";
  if (/(subscription[_-]?renewed|renewed)/.test(n)) return "subscription_renewed";
  if (/(subscription[_-]?canceled|canceled|cancelled)/.test(n)) return "subscription_canceled";
  if (/(order[_-]?approved|paid|approved)/.test(n)) return "purchase_approved";
  if (/(billet[_-]?overdue|rejected|pix[_-]?expired|expired|overdue|failed)/.test(n))
    return "payment_failed";
  return "unknown";
}
function detectCakto(name: string): BillingEventType {
  const n = name.toLowerCase();
  if (/refund/.test(n)) return "refunded";
  if (/chargeback/.test(n)) return "chargeback";
  if (/renewed/.test(n)) return "subscription_renewed";
  if (/canceled|cancelled/.test(n)) return "subscription_canceled";
  if (/paid|approved|purchase[_-]?approved/.test(n)) return "purchase_approved";
  if (/payment[_-]?failed|overdue|failed/.test(n)) return "payment_failed";
  return "unknown";
}
function detectPerfectPay(name: string, code?: any): BillingEventType {
  const n = name.toLowerCase();
  const c = code != null ? String(code) : "";
  if (n.includes("refund") || c === "7") return "refunded";
  if (n.includes("chargeback")) return "chargeback";
  if (n.includes("canceled") || n.includes("cancelled")) return "subscription_canceled";
  if (n.includes("approved") || c === "2") return "purchase_approved";
  if (/fail|expired/.test(n)) return "payment_failed";
  return "unknown";
}
function detectHotmart(name: string): BillingEventType {
  const n = name.toUpperCase();
  if (n === "PURCHASE_REFUNDED") return "refunded";
  if (n === "PURCHASE_CHARGEBACK") return "chargeback";
  if (n === "SUBSCRIPTION_CANCELLATION") return "subscription_canceled";
  if (n === "PURCHASE_APPROVED" || n === "PURCHASE_COMPLETE") return "purchase_approved";
  if (n === "PURCHASE_DELAYED" || n === "PURCHASE_BILLET_PRINTED") return "payment_failed";
  if (n.includes("SUBSCRIPTION") || n.includes("RENEW")) return "subscription_renewed";
  return "unknown";
}
function detectKirvano(name: string): BillingEventType {
  const n = name.toUpperCase();
  if (n === "SALE_REFUNDED") return "refunded";
  if (n === "CHARGEBACK") return "chargeback";
  if (n === "SUBSCRIPTION_CANCELED") return "subscription_canceled";
  if (n === "SUBSCRIPTION_RENEWED") return "subscription_renewed";
  if (n === "SALE_APPROVED" || n === "sale_approved".toUpperCase()) return "purchase_approved";
  if (/EXPIRED|ABANDONED|PAYMENT_FAILED/.test(n)) return "payment_failed";
  return "unknown";
}

export function normalize(
  provider: BillingProvider,
  body: Record<string, any>,
): NormalizedBillingEvent {
  const b = body ?? {};
  const data = b.data ?? {};
  let rawEventName = "";
  let eventType: BillingEventType = "unknown";
  let buyerEmail: string | null = null;
  let externalSubscriptionId: string | null = null;
  let externalCustomerId: string | null = null;
  let productRef: string | null = null;
  let amountCents: number | null = null;
  let periodEnd: string | null = null;

  switch (provider) {
    case "kiwify": {
      rawEventName = String(pick(b.webhook_event_type, b.event, b.order_status, data.event, "") ?? "");
      eventType = detectKiwify(rawEventName);
      buyerEmail = lower(pick(b.Customer?.email, b.customer?.email, b.buyer?.email, data.customer?.email));
      externalSubscriptionId = pick(b.Subscription?.id, b.subscription_id, b.subscription?.id);
      externalCustomerId = pick(b.Customer?.id, b.customer?.id, b.customer_id);
      productRef = String(pick(b.Product?.product_id, b.product_id, b.offer_id, b.Product?.id) ?? "") || null;
      amountCents = digits(pick(b.Commissions?.charge_amount, b.charge_amount, b.amount));
      periodEnd = pick(b.Subscription?.next_payment, b.subscription?.next_payment);
      break;
    }
    case "cakto": {
      rawEventName = String(pick(b.event, b.status, data.status, "") ?? "");
      eventType = detectCakto(rawEventName);
      buyerEmail = lower(pick(data.customer?.email, b.customer?.email, b.email));
      externalSubscriptionId = pick(data.subscription?.id, b.subscription_id);
      externalCustomerId = pick(data.customer?.id, b.customer?.id);
      productRef = String(pick(data.product?.id, b.product?.id, b.offer_id, data.offer_id) ?? "") || null;
      amountCents = digits(pick(data.amount, b.amount, data.price));
      periodEnd = pick(data.subscription?.next_billing, data.next_billing);
      break;
    }
    case "perfectpay": {
      const code = pick(b.sale_status_enum, b.status_code, b.status);
      rawEventName = String(pick(b.sale_status_detail, b.status, b.event, "") ?? "");
      eventType = detectPerfectPay(rawEventName, code);
      buyerEmail = lower(pick(b.customer?.email, b.email, b.payer_email));
      externalSubscriptionId = pick(b.subscription?.code, b.subscription_code, b.code);
      externalCustomerId = pick(b.customer?.id, b.customer_code);
      productRef = String(pick(b.product?.code, b.plan?.code, b.product_code) ?? "") || null;
      amountCents = digits(pick(b.sale_amount, b.amount));
      periodEnd = pick(b.subscription?.next_charge_date, b.next_payment);
      break;
    }
    case "hotmart": {
      rawEventName = String(pick(b.event, b.type, "") ?? "");
      eventType = detectHotmart(rawEventName);
      buyerEmail = lower(pick(data.buyer?.email, b.buyer?.email, data.subscriber?.email));
      externalSubscriptionId = pick(data.subscription?.subscriber?.code, data.subscription?.code);
      externalCustomerId = pick(data.buyer?.ucode, data.buyer?.id);
      productRef = String(pick(data.product?.id, data.product?.ucode, b.product?.id) ?? "") || null;
      amountCents = digits(pick(data.purchase?.price?.value, data.commission?.value));
      periodEnd = pick(data.subscription?.date_next_charge, data.subscription?.end_accession_date);
      break;
    }
    case "kirvano": {
      rawEventName = String(pick(b.event, b.type, "") ?? "");
      eventType = detectKirvano(rawEventName);
      buyerEmail = lower(pick(b.customer?.email, b.email, data.customer?.email));
      externalSubscriptionId = pick(b.subscription?.id, b.subscription_id);
      externalCustomerId = pick(b.customer?.id, b.customer_id);
      productRef = String(pick(b.product_id, b.offer_id, b.plan_id, b.product?.id, b.plan?.id) ?? "") || null;
      amountCents = digits(pick(b.amount, b.total_price, b.value));
      periodEnd = pick(b.subscription?.next_charge_date, b.next_billing_at);
      break;
    }
  }

  return {
    provider,
    eventType,
    rawEventName,
    buyerEmail,
    externalSubscriptionId: externalSubscriptionId ? String(externalSubscriptionId) : null,
    externalCustomerId: externalCustomerId ? String(externalCustomerId) : null,
    productRef,
    amountCents,
    periodEnd: periodEnd ? String(periodEnd) : null,
  };
}
