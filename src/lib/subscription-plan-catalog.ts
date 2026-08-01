export type SubscriptionPlan = {
  id: string;
  slug: "starter" | "pro" | "elite";
  nome: string;
  descricao: string;
  preco_cents: number;
  intervalo: "month";
  features: string[];
  destaque: boolean;
  ordem: number;
  checkout_url: null;
};

export const SUBSCRIPTION_PLAN_CATALOG: SubscriptionPlan[] = [
  {
    id: "catalog-starter",
    slug: "starter",
    nome: "Starter",
    descricao: "Para barbeiros autônomos que estão começando.",
    preco_cents: 9700,
    intervalo: "month",
    features: [
      "Agenda inteligente",
      "Cadastro de clientes",
      "Link de agendamento online",
    ],
    destaque: false,
    ordem: 1,
    checkout_url: null,
  },
  {
    id: "catalog-pro",
    slug: "pro",
    nome: "Pro",
    descricao: "Para barbearias em crescimento.",
    preco_cents: 29700,
    intervalo: "month",
    features: [
      "Tudo do Starter",
      "Multiprofissional",
      "Financeiro e comissões",
      "Lembretes automáticos",
    ],
    destaque: true,
    ordem: 2,
    checkout_url: null,
  },
  {
    id: "catalog-elite",
    slug: "elite",
    nome: "Elite",
    descricao: "Para redes e barbearias premium.",
    preco_cents: 49700,
    intervalo: "month",
    features: [
      "Tudo do Pro",
      "Clube de assinatura",
      "IA de crescimento",
      "API e webhooks",
      "Suporte prioritário",
    ],
    destaque: false,
    ordem: 3,
    checkout_url: null,
  },
];