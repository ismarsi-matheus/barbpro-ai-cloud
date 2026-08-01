import { provisionClubBenefits, cancelClubMembershipBySubscription, expireEndedClubMemberships } from "@/lib/club/club.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const admin = supabaseAdmin as any;

const COMPANY = "bb533a43-2a6d-4605-a247-ac0cb19b10ac";
const PLAN = "e25b035f-1d3d-425c-b4a1-da68e6648897";
const CUSTOMER = "4cd336fc-c074-4d83-9808-4757b232d61d";
const SUB = "sub_test_" + Date.now();
const now = Math.floor(Date.now() / 1000);
const DAY = 86400;

const meta = { kind: "club_membership", company_id: COMPANY, club_plan_id: PLAN, customer_id: CUSTOMER, user_id: "", creditos_mensais: "4", slug: "x" };
const sub = (o: any = {}) => ({ id: SUB, status: "active", customer: "cus_test", cancel_at_period_end: false, metadata: { ...meta, ...(o.metadata ?? {}) }, items: { data: [{ current_period_start: o.start ?? now, current_period_end: o.end ?? now + 30 * DAY }] }, status: o.status ?? "active", cancel_at_period_end: o.cancel_at_period_end ?? false }) as any;

const show = async (label: string) => {
  const { data } = await admin.from("club_member").select("status,creditos_restantes,beneficios_utilizados,current_period_end,cancel_at_period_end,club_plan_id").eq("stripe_subscription_id", SUB).maybeSingle();
  console.log(label.padEnd(34), JSON.stringify(data));
  return data;
};
const usar = async (n: number) => {
  const cur = await admin.from("club_member").select("id,creditos_restantes,beneficios_utilizados").eq("stripe_subscription_id", SUB).single();
  await admin.from("club_member").update({ creditos_restantes: cur.data.creditos_restantes - n, beneficios_utilizados: cur.data.beneficios_utilizados + n }).eq("id", cur.data.id);
};

console.log("1) assinatura nova"); await provisionClubBenefits(sub()); await show("apos assinatura");
console.log("2) webhook duplicado (mesmo periodo)"); await provisionClubBenefits(sub()); await provisionClubBenefits(sub()); await show("apos 2 webhooks duplicados");
console.log("3) usa 1 benefício"); await usar(1); await show("apos usar 1");
console.log("4) usa 2 benefícios"); await usar(2); await show("apos usar +2");
console.log("5) webhook reenviado apos uso"); await provisionClubBenefits(sub()); await show("saldo preservado?");
console.log("6) renovacao mensal (invoice.paid)"); await provisionClubBenefits(sub({ start: now + 30 * DAY, end: now + 60 * DAY })); await show("apos renovacao");
console.log("7) renovacao reenviada (duplicada)"); await usar(1); await provisionClubBenefits(sub({ start: now + 30 * DAY, end: now + 60 * DAY })); await show("dedup renovacao");
console.log("8) cancelamento (periodo vigente)"); await cancelClubMembershipBySubscription(SUB); await show("apos cancelar");
console.log("9) reativacao"); await provisionClubBenefits(sub({ start: now + 30 * DAY, end: now + 60 * DAY })); await show("apos reativar");
console.log("10) upgrade de plano (mesmo periodo)");
const up = await admin.from("club_plan").insert({ company_id: COMPANY, nome: "QA Upgrade", preco_cents: 15000, creditos_mensais: 8, ativo: false, beneficios: [] }).select("id").single();
await provisionClubBenefits(sub({ start: now + 30 * DAY, end: now + 60 * DAY, metadata: { club_plan_id: up.data.id } })); await show("apos upgrade (8 - 1 usado)");
console.log("11) downgrade de plano");
const dn = await admin.from("club_plan").insert({ company_id: COMPANY, nome: "QA Downgrade", preco_cents: 5000, creditos_mensais: 2, ativo: false, beneficios: [] }).select("id").single();
await provisionClubBenefits(sub({ start: now + 30 * DAY, end: now + 60 * DAY, metadata: { club_plan_id: dn.data.id } })); await show("apos downgrade (2 - 1 usado)");
console.log("12) periodo expirado apos cancelamento");
await cancelClubMembershipBySubscription(SUB);
await admin.from("club_member").update({ current_period_end: new Date(Date.now() - DAY * 1000).toISOString() }).eq("stripe_subscription_id", SUB);
console.log("expiradas:", await expireEndedClubMemberships()); await show("apos expirar");

// limpeza
const m = await admin.from("club_member").select("id").eq("stripe_subscription_id", SUB).single();
await admin.from("club_member").delete().eq("id", m.data.id);
await admin.from("club_plan").delete().in("id", [up.data.id, dn.data.id]);
console.log("limpeza ok");
