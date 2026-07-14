import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PlanCheckoutDialog } from "@/components/plan-checkout-dialog";
import {
  CalendarCheck, Scissors, Users, DollarSign, Sparkles, Check, ArrowRight,
  UserCog, Globe, BarChart3, Brain, Store,
  Notebook, UserX, Percent, LineChart, CalendarX, MessageSquareWarning,
  Zap, Star, Clock, Package, LayoutDashboard, Crown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarbeiroPro AI — Sistema Inteligente para Barbearias" },
      { name: "description", content: "Agenda online, comissões automáticas, financeiro e IA pra recuperar clientes. 14 dias grátis." },
      { property: "og:title", content: "BarbeiroPro AI — Sistema Inteligente para Barbearias" },
      { property: "og:description", content: "Agenda online, comissões automáticas, financeiro e IA pra recuperar clientes. 14 dias grátis." },
    ],
  }),
  component: LandingPage,
});

const BRAND = "#1B3A4B";
const TAGLINE = "Sistema Inteligente para Barbearias";

const MODULES = [
  { icon: CalendarCheck, title: "Agenda online", desc: "Calendário semanal visual com agendamentos coloridos por profissional. Reagende com drag-and-drop." },
  { icon: UserCog, title: "Profissionais", desc: "Cadastre barbeiros com foto, especialidade, horários e veja a agenda individual de cada um." },
  { icon: Percent, title: "Comissões automáticas", desc: "Comissão fixa ou percentual por serviço. Calcule tudo no fim do mês sem planilha." },
  { icon: Users, title: "Clientes recorrentes", desc: "Histórico completo, tags VIP/recorrente/novo e timeline de atendimentos." },
  { icon: Store, title: "Vitrine de serviços", desc: "Catálogo organizado por categoria com preços, duração e destaques." },
  { icon: DollarSign, title: "Financeiro integrado", desc: "Entradas e saídas conectadas aos atendimentos. Faturamento em tempo real." },
  { icon: BarChart3, title: "Relatórios", desc: "Faturamento, ocupação, ticket médio, ranking de profissionais e serviços." },
  { icon: Brain, title: "AI Growth", desc: "IA identifica clientes inativos, horários vazios e oportunidades de receita." },
  { icon: Globe, title: "Booking público", desc: "Link único da barbearia. Cliente agenda 24/7 sem precisar baixar nada." },
];

const PAINS = [
  { icon: Notebook, title: "Agenda em caderninho", desc: "Cliente liga e você não acha o horário. Rabiscos e cancelamentos perdidos." },
  { icon: UserX, title: "Cliente que não volta", desc: "Sem histórico, você esquece de chamar quem está sumido há 60 dias." },
  { icon: Percent, title: "Comissão confusa", desc: "Fim de mês vira planilha cheia de erro pra calcular o que pagar pra cada barbeiro." },
  { icon: LineChart, title: "Sem dados de desempenho", desc: "Você não sabe qual serviço dá mais lucro nem qual profissional fatura mais." },
  { icon: CalendarX, title: "Sem agendamento online", desc: "Cliente quer marcar de noite, você só atende de dia. Perde a venda." },
  { icon: MessageSquareWarning, title: "WhatsApp lotado", desc: "Cliente confirmando, perguntando preço, marcando, cancelando — tudo manual." },
];

const STATS = [
  { value: "2.400+", label: "Barbearias ativas" },
  { value: "180k+", label: "Agendamentos/mês" },
  { value: "98%", label: "Taxa de retenção" },
  { value: "4.9★", label: "Avaliação média" },
];

const STEPS = [
  { n: "01", title: "Escolha um plano", desc: "Comece com 14 dias grátis. Sem cartão de crédito." },
  { n: "02", title: "Cadastre sua barbearia", desc: "Nome, logo, serviços e profissionais em minutos." },
  { n: "03", title: "Clientes agendam online", desc: "Seu link público em /agendar/suabarbearia." },
  { n: "04", title: "Gerencie e cresça", desc: "Painel completo com IA orientando próximos passos." },
];

const AI_CHECKS = [
  "Detecção de clientes inativos",
  "Análise de horários fracos",
  "Mensagens prontas para reativação",
  "Insights de serviços com baixa demanda",
];

const FEATURE_CARDS = [
  {
    icon: CalendarCheck,
    title: "Agenda Inteligente",
    items: ["Agendamento online", "Confirmação automática", "Lembretes"],
    color: "from-sky-500/10 to-cyan-500/10",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600",
  },
  {
    icon: Users,
    title: "Clientes",
    items: ["Histórico", "Perfil", "Área do Cliente"],
    color: "from-violet-500/10 to-purple-500/10",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    items: ["Caixa", "Entradas", "Saídas", "Relatórios"],
    color: "from-emerald-500/10 to-teal-500/10",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: UserCog,
    title: "Equipe",
    items: ["Profissionais", "Comissão", "Agenda individual"],
    color: "from-amber-500/10 to-orange-500/10",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
  {
    icon: Package,
    title: "Estoque",
    items: ["Produtos", "Controle automático", "Alertas"],
    color: "from-rose-500/10 to-pink-500/10",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    items: ["Indicadores", "Gráficos", "Crescimento"],
    color: "from-indigo-500/10 to-blue-500/10",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600",
  },
];

type PlanUI = {
  slug: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  badge?: { icon: any; label: string; className: string };
  highlighted?: boolean;
  accent?: boolean;
};

const PLAN_CARDS: PlanUI[] = [
  {
    slug: "start",
    name: "Start",
    price: 97,
    description: "Ideal para barbeiros autônomos.",
    features: [
      "1 profissional",
      "Agenda online",
      "Cadastro de clientes",
      "Área do Cliente",
      "Confirmação por e-mail",
      "Cancelamento online",
      "Dashboard básico",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    price: 297,
    description: "Ideal para barbearias em crescimento.",
    badge: { icon: Star, label: "Mais vendido", className: "bg-amber-400 text-amber-950" },
    highlighted: true,
    features: [
      "Tudo do Start +",
      "Até 5 profissionais",
      "Financeiro completo",
      "Comandas",
      "Estoque",
      "Comissão automática",
      "Relatórios",
      "Lembretes automáticos",
      "Gestão completa",
    ],
  },
  {
    slug: "elite",
    name: "Elite",
    price: 497,
    description: "Para barbearias que desejam automatizar toda a operação.",
    badge: { icon: Crown, label: "Melhor custo-benefício", className: "bg-violet-500 text-white" },
    accent: true,
    features: [
      "Tudo do Pro +",
      "Profissionais ilimitados",
      "Produtos ilimitados",
      "Dashboard avançado",
      "IA do BarbeiroPro",
      "Recursos antecipados",
      "Suporte prioritário",
      "API futura",
      "Backup e monitoramento",
    ],
  },
];

type PlanRow = {
  slug: string;
  nome: string;
  preco_cents: number;
  trial_days: number;
  destaque: boolean;
  descricao: string | null;
  features: any;
  ordem: number;
};

function scrollToPlans(e?: React.MouseEvent) {
  if (e) e.preventDefault();
  document.getElementById("planos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LandingPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<{ slug: string; name: string; price: number; trial_days?: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("plan")
      .select("slug, nome, preco_cents, trial_days, destaque, descricao, features, ordem")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => setPlans((data as any) ?? []));
  }, []);

  const openPlanCard = (card: PlanUI) => {
    // Try to match a real DB plan by slug or by name (case-insensitive)
    const dbPlan = plans.find(
      (p) =>
        p.slug?.toLowerCase() === card.slug ||
        p.nome?.toLowerCase() === card.name.toLowerCase(),
    );
    if (dbPlan) {
      setSelectedPlan({
        slug: dbPlan.slug,
        name: dbPlan.nome,
        price: Math.round((dbPlan.preco_cents ?? 0) / 100),
        trial_days: dbPlan.trial_days,
      });
    } else {
      setSelectedPlan({
        slug: card.slug,
        name: card.name,
        price: card.price,
        trial_days: 14,
      });
    }
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#1B1C1E]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-md focus:shadow">Ir para o conteúdo</a>
      <header className="border-b border-black/5 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: BRAND }} aria-hidden="true">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-bold tracking-tight truncate">BarbeiroPro AI</div>
              <div className="text-[10px] text-black/50 truncate hidden sm:block">{TAGLINE}</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 shrink-0" aria-label="Navegação principal">
            <Button asChild variant="ghost" size="sm">
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button size="sm" className="text-white" style={{ backgroundColor: BRAND }} onClick={() => scrollToPlans()}>
              Ver planos
            </Button>
          </nav>
        </div>
      </header>

      <main id="conteudo">


      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: BRAND + "1A", color: BRAND }}>
          <Sparkles className="w-3 h-3" /> 14 dias grátis, sem cartão de crédito
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight" style={{ color: BRAND }}>
          A barbearia profissional roda em sistema profissional.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-black/60 max-w-2xl mx-auto">
          Agenda online, comissões automáticas, clientes em ordem, financeiro claro e IA que te avisa quando algo dá pra melhorar.
        </p>
        <div className="mt-8 flex items-center gap-3 justify-center flex-wrap">
          <Button size="lg" className="text-white" style={{ backgroundColor: BRAND }} onClick={() => scrollToPlans()}>
            Ver planos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/demo/dashboard">Ver demo</Link>
          </Button>

        </div>
      </section>

      {/* STATS BANNER */}
      <section className="py-16 px-6" style={{ backgroundColor: BRAND }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-black text-white">{s.value}</div>
              <div className="text-sm text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="bg-white border-y border-black/5 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: BRAND }}>Você se reconhece nisso?</h2>
            <p className="text-black/60 mt-2">Os 6 problemas mais comuns que a gente resolve.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PAINS.map((p) => (
              <div key={p.title} className="p-5 rounded-xl border border-black/5 bg-[#F8F7F3]">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                  <p.icon className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-black/60 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold" style={{ color: BRAND }}>9 módulos. Um sistema.</h2>
          <p className="text-black/60 mt-2">Tudo o que sua barbearia precisa, integrado de verdade.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <div key={m.title} className="p-6 rounded-xl bg-white border border-black/5 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: BRAND + "1A" }}>
                <m.icon className="w-5 h-5" style={{ color: BRAND }} />
              </div>
              <h3 className="font-semibold">{m.title}</h3>
              <p className="text-sm text-black/60 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-y border-black/5 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: BRAND }}>Como funciona</h2>
            <p className="text-black/60 mt-2">Em minutos sua barbearia está operando.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black" style={{ backgroundColor: BRAND }}>
                  {s.n}
                </div>
                <h3 className="font-bold mt-4">{s.title}</h3>
                <p className="text-sm text-black/60 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI GROWTH SECTION */}
      <section className="py-20 px-6" style={{ backgroundColor: "#F8F7F3" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: BRAND + "1A", color: BRAND }}>
              <Zap className="w-3 h-3" /> AI GROWTH ENGINE
            </div>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: BRAND }}>
              IA que trabalha enquanto você corta.
            </h2>
            <p className="mt-4 text-black/60">
              Enquanto você cuida do cliente na cadeira, nossa IA analisa seus dados e te avisa exatamente onde tem receita escondida.
            </p>
            <ul className="mt-6 space-y-3">
              {AI_CHECKS.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Check className="w-5 h-5" style={{ color: BRAND }} /> <span>{c}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 text-white" style={{ backgroundColor: BRAND }}>
              <Link to="/demo/aigrowth">
                Ver AI Growth na Demo <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>

          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-black/5 p-5 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm">12 clientes inativos detectados</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold shrink-0">Reativar</span>
                </div>
                <p className="text-xs text-black/60 mt-1">Última visita há +30 dias. Mensagem pronta para disparar.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 p-5 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm">Segunda-feira às 14h está vazia</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">Oportunidade</span>
                </div>
                <p className="text-xs text-black/60 mt-1">Horário com 0 agendamentos nas últimas 4 semanas.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 p-5 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm">8 clientes VIP sem retorno</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold shrink-0">VIP</span>
                </div>
                <p className="text-xs text-black/60 mt-1">Clientes que gastaram +R$500 não voltam há 21 dias.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TUDO QUE SUA BARBEARIA PRECISA */}
      <section className="bg-white border-y border-black/5 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: BRAND }}>
              Tudo que sua barbearia precisa em um só lugar
            </h2>
            <p className="text-black/60 mt-4 text-base sm:text-lg">
              Gerencie clientes, agenda, equipe, estoque e financeiro de forma simples, moderna e totalmente online.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_CARDS.map((f) => (
              <div
                key={f.title}
                className={`group relative p-6 rounded-2xl border border-black/5 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: BRAND }}>{f.title}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {f.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm text-black/70">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="relative py-20 sm:py-28 overflow-hidden" style={{ background: "linear-gradient(180deg, #F8F7F3 0%, #ffffff 100%)" }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage: "radial-gradient(circle at 20% 10%, rgba(27,58,75,0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(139,92,246,0.08), transparent 40%)",
        }} />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: BRAND }}>
              Escolha o plano ideal para sua barbearia
            </h2>
            <p className="text-black/60 mt-4 text-base sm:text-lg">
              Comece gratuitamente e evolua conforme sua barbearia cresce.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            {PLAN_CARDS.map((card) => {
              const isHighlight = !!card.highlighted;
              const isAccent = !!card.accent;
              return (
                <div
                  key={card.slug}
                  className={[
                    "relative flex flex-col rounded-3xl p-7 sm:p-8 transition-all duration-300 backdrop-blur",
                    "border shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] hover:-translate-y-1",
                    isHighlight
                      ? "text-white border-white/10 md:scale-[1.04] md:-mt-2 shadow-[0_24px_60px_-20px_rgba(27,58,75,0.55)]"
                      : "bg-white/80 border-black/5",
                  ].join(" ")}
                  style={
                    isHighlight
                      ? { background: `linear-gradient(160deg, ${BRAND} 0%, #14283a 100%)` }
                      : undefined
                  }
                >
                  {card.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm ${card.badge.className}`}>
                        <card.badge.icon className="w-3.5 h-3.5" />
                        {card.badge.label}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className={`text-xl font-bold ${isHighlight ? "text-white" : ""}`} style={!isHighlight ? { color: BRAND } : undefined}>
                      Plano {card.name}
                    </h3>
                    <p className={`text-sm mt-1 ${isHighlight ? "text-white/70" : "text-black/60"}`}>
                      {card.description}
                    </p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className={`text-4xl sm:text-5xl font-black ${isHighlight ? "text-white" : ""}`} style={!isHighlight ? { color: BRAND } : undefined}>
                        R$ {card.price}
                      </span>
                      <span className={isHighlight ? "text-white/60" : "text-black/50"}>/mês</span>
                    </div>
                    <p className={`text-xs mt-1 ${isHighlight ? "text-white/50" : "text-black/40"}`}>
                      14 dias grátis para testar
                    </p>
                  </div>

                  <ul className="mt-7 space-y-2.5 flex-1">
                    {card.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isHighlight ? "text-emerald-300" : isAccent ? "text-violet-600" : "text-emerald-600"}`} />
                        <span className={isHighlight ? "text-white/90" : "text-black/75"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => openPlanCard(card)}
                    size="lg"
                    className={[
                      "w-full mt-8 font-semibold",
                      isHighlight
                        ? "bg-white hover:bg-white/90 shadow-lg"
                        : isAccent
                        ? "text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95"
                        : "text-white",
                    ].join(" ")}
                    style={
                      isHighlight
                        ? { color: BRAND }
                        : isAccent
                        ? undefined
                        : { backgroundColor: BRAND }
                    }
                  >
                    Começar Agora <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6" style={{ backgroundColor: BRAND }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
            Pronto para transformar sua barbearia?
          </h2>
          <p className="text-white/70 mt-4 text-base sm:text-lg">
            Explore a demo completa, sem cadastro.
          </p>
          <div className="mt-8 flex items-center gap-3 justify-center flex-wrap">
            <Button size="lg" className="bg-white hover:bg-white/90" style={{ color: BRAND }} onClick={() => scrollToPlans()}>
              Ver Planos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Link to="/demo/dashboard">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      </main>

      <footer className="py-10 px-4 sm:px-6" style={{ backgroundColor: "#111418" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND }} aria-hidden="true">

              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold">BarbeiroPro AI</div>
              <div className="text-[11px] text-white/40">{TAGLINE}</div>
            </div>
          </div>
          <div className="text-sm text-white/40 text-center md:text-right">© {new Date().getFullYear()} BarbeiroPro AI. Todos os direitos reservados.</div>
        </div>
      </footer>

      <PlanCheckoutDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={selectedPlan} />
    </div>
  );
}
