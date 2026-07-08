import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PlanCheckoutDialog } from "@/components/plan-checkout-dialog";
import {
  CalendarCheck, Scissors, Users, DollarSign, Sparkles, Check, ArrowRight,
  UserCog, Globe, BarChart3, Brain, Store,
  Notebook, UserX, Percent, LineChart, CalendarX, MessageSquareWarning,
  Zap, Star, Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarbeiroPro AI — Sistema completo para barbearias" },
      { name: "description", content: "Agenda online, comissões automáticas, financeiro e IA pra recuperar clientes. 14 dias grátis." },
      { property: "og:title", content: "BarbeiroPro AI — Sistema para barbearias" },
      { property: "og:description", content: "Agenda online, comissões, financeiro e AI Growth para barbearias modernas." },
    ],
  }),
  component: LandingPage,
});

const BRAND = "#1B3A4B";

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

const TURBO_STEPS = [
  "Você recebe pronto, código completo",
  "Clona o template Base44 com 1 clique",
  "Personaliza marca, cores e textos",
  "Vende para barbearias da sua região",
];

const TURBO_FEATURES = [
  "Sistema multi-empresa",
  "Modo demo completo",
  "Booking público whitelabel",
  "AI Growth nativa",
  "Landing page pública",
  "Código aberto e auditável",
  "Infraestrutura já configurada",
];

const AI_CHECKS = [
  "Detecção de clientes inativos",
  "Análise de horários fracos",
  "Mensagens prontas para reativação",
  "Insights de serviços com baixa demanda",
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

  const openPlan = (p: PlanRow) => {
    setSelectedPlan({
      slug: p.slug,
      name: p.nome,
      price: Math.round((p.preco_cents ?? 0) / 100),
      trial_days: p.trial_days,
    });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#1B1C1E]">
      <header className="border-b border-black/5 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND }}>
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">BarbeiroPro AI</div>
              <div className="text-[10px] text-black/50">parte do TurboSaaS</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/entrar"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Button size="sm" className="text-white" style={{ backgroundColor: BRAND }} onClick={() => scrollToPlans()}>
              Ver planos
            </Button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: BRAND + "1A", color: BRAND }}>
          <Sparkles className="w-3 h-3" /> 14 dias grátis, sem cartão de crédito
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight" style={{ color: BRAND }}>
          A barbearia profissional roda em sistema profissional.
        </h1>
        <p className="mt-6 text-lg text-black/60 max-w-2xl mx-auto">
          Agenda online, comissões automáticas, clientes em ordem, financeiro claro e IA que te avisa quando algo dá pra melhorar.
        </p>
        <div className="mt-8 flex items-center gap-3 justify-center flex-wrap">
          <Button size="lg" className="text-white" style={{ backgroundColor: BRAND }} onClick={() => scrollToPlans()}>
            Ver planos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Link to="/demo/dashboard">
            <Button size="lg" variant="outline">Ver demo</Button>
          </Link>
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
          <div className="grid md:grid-cols-3 gap-4">
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
        <div className="grid md:grid-cols-3 gap-4">
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
          <div className="grid md:grid-cols-4 gap-6">
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
            <h2 className="text-4xl font-black leading-tight" style={{ color: BRAND }}>
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
            <Link to="/demo/aigrowth">
              <Button size="lg" className="mt-8 text-white" style={{ backgroundColor: BRAND }}>
                Ver AI Growth na Demo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
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

      {/* TURBOSAAS */}
      <section className="bg-white border-y border-black/5 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: BRAND + "1A", color: BRAND }}>
              Parte do ecossistema TurboSaaS
            </div>
            <h2 className="text-3xl md:text-4xl font-black max-w-3xl mx-auto leading-tight" style={{ color: BRAND }}>
              Esse não é um template. É um produto pronto pra revenda.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl border border-black/5 bg-[#F8F7F3]">
              <h3 className="font-bold text-lg mb-5" style={{ color: BRAND }}>Como funciona o TurboSaaS</h3>
              <ol className="space-y-4">
                {TURBO_STEPS.map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: BRAND }}>
                      {i + 1}
                    </div>
                    <span className="pt-1">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="p-8 rounded-2xl border border-black/5 bg-[#F8F7F3]">
              <h3 className="font-bold text-lg mb-5" style={{ color: BRAND }}>O que vem incluído</h3>
              <ul className="space-y-3">
                {TURBO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-5 h-5" style={{ color: BRAND }} /> <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: BRAND }}>Planos simples e claros</h2>
            <p className="text-black/60 mt-2">Comece grátis. Cresça com o plano certo.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {plans.map((p) => {
              const highlighted = p.destaque;
              const price = Math.round((p.preco_cents ?? 0) / 100);
              const featureList: string[] = Array.isArray(p.features)
                ? (p.features as any[]).map((f) => (typeof f === "string" ? f : (f?.label ?? f?.name ?? ""))).filter(Boolean)
                : [];
              return (
                <div
                  key={p.slug}
                  className={`p-6 rounded-2xl border ${highlighted ? "text-white" : "bg-[#F8F7F3] border-black/5"}`}
                  style={highlighted ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                >
                  {highlighted && <div className="text-xs font-bold mb-2 opacity-80">MAIS POPULAR</div>}
                  <h3 className="text-xl font-bold">{p.nome}</h3>
                  {p.descricao && (
                    <p className={`text-sm mt-1 ${highlighted ? "text-white/70" : "text-black/60"}`}>{p.descricao}</p>
                  )}
                  <div className="mt-4">
                    <span className="text-4xl font-black">{price === 0 ? "Grátis" : `R$${price}`}</span>
                    {price > 0 && (
                      <span className={highlighted ? "text-white/70" : "text-black/60"}>/mês</span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${highlighted ? "text-white/60" : "text-black/50"}`}>
                    {p.trial_days} dias grátis pra testar
                  </p>
                  {featureList.length > 0 && (
                    <ul className="mt-6 space-y-2">
                      {featureList.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? "text-white" : "text-emerald-600"}`} /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    onClick={() => openPlan(p)}
                    className={`w-full mt-6 ${highlighted ? "bg-white hover:bg-white/90" : "text-white"}`}
                    style={highlighted ? { color: BRAND } : { backgroundColor: BRAND }}
                  >
                    Começar com {p.nome}
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
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Pronto para transformar sua barbearia?
          </h2>
          <p className="text-white/70 mt-4 text-lg">
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

      <footer className="py-10 px-6" style={{ backgroundColor: "#111418" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND }}>
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold">BarbeiroPro AI</div>
              <div className="text-[11px] text-white/40">parte do TurboSaaS</div>
            </div>
          </div>
          <div className="text-sm text-white/40">© {new Date().getFullYear()} BarbeiroPro AI. Todos os direitos reservados.</div>
        </div>
      </footer>

      <PlanCheckoutDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={selectedPlan} />
    </div>

  );
}
