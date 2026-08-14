import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientAccountNav } from "@/components/client/client-account-nav";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PlanCheckoutDialog } from "@/components/plan-checkout-dialog";
import { 
  Calendar, Users, Percent, LineChart, Clock, MessageSquare, 
  ArrowRight, Zap, Star, ShieldCheck, TrendingUp, Scissors,
  Check, Play, ArrowUpRight, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import dashboardPreview from "@/assets/dashboard-preview.png.asset.json";
import aiGrowthAsset from "@/assets/ai-growth-preview.png.asset.json";


export const Route = createFileRoute("/")({

  head: () => ({
    meta: [
      { title: "BarbeiroPro AI — Sistema Inteligente para Barbearias" },
      { name: "description", content: "Transforme sua barbearia com agendamento online, gestão financeira e IA. Teste grátis por 14 dias." },
      { property: "og:title", content: "BarbeiroPro AI — Sistema Inteligente para Barbearias" },
      { property: "og:description", content: "Transforme sua barbearia com agendamento online, gestão financeira e IA. Teste grátis por 14 dias." },
      { property: "og:image", content: "https://barbeiropro.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const BRAND = "#1B3A4B";

function scrollToPlans() {
  document.getElementById("planos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LandingPage() {
  // Fonte única dos planos públicos: catálogo em código (mesma fonte usada em
  // /app/checkout). A tabela `plan` só sobrescreve quando estiver populada.
  const [plans, setPlans] = useState<any[]>(SUBSCRIPTION_PLAN_CATALOG);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    supabase
      .from("plan")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => {
        if (data && data.length > 0) setPlans(data);
      });
  }, []);

  const handlePlanClick = (plan: any) => {
    setSelectedPlan({
      slug: plan.slug,
      name: plan.nome,
      price: Math.round(plan.preco_cents / 100),
      trial_days: plan.trial_days || 14
    });
    setDialogOpen(true);
  };


  return (
    <div className="min-h-screen bg-white text-[#1B1C1E] selection:bg-[#1B3A4B] selection:text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B3A4B] flex items-center justify-center shadow-lg shadow-black/10">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">BarbeiroPro AI</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-black/60">
            <a href="#recursos" className="hover:text-black transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-black transition-colors">Como funciona</a>
            <a href="#clube" className="hover:text-black transition-colors">Clube</a>
            <a href="#planos" className="hover:text-black transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ClientAccountNav className="hidden sm:flex" signedOutLabel="Área do cliente" />
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex rounded-full px-4 text-black/70 hover:text-black"
            >
              <Link to="/entrar">Sou barbearia</Link>
            </Button>
            <Button size="sm" className="hidden sm:flex bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90 rounded-full px-6" onClick={scrollToPlans}>
              Começar grátis
            </Button>

            {/* Mobile */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader className="text-left">
                  <SheetTitle>BarbeiroPro AI</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1 text-sm font-medium">
                  {[
                    ["#recursos", "Recursos"],
                    ["#como-funciona", "Como funciona"],
                    ["#clube", "Clube"],
                    ["#planos", "Planos"],
                  ].map(([href, label]) => (
                    <a
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-3 py-2.5 hover:bg-muted"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                    <Link to="/cliente/entrar">Área do cliente</Link>
                  </Button>
                  <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                    <Link to="/entrar">Sou barbearia</Link>
                  </Button>
                  <Button
                    className="bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90"
                    onClick={() => {
                      setMenuOpen(false);
                      scrollToPlans();
                    }}
                  >
                    Começar grátis
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>


      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 sm:pt-48 sm:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B3A4B]/5 text-[#1B3A4B] text-xs font-bold mb-6">
                  <Zap className="w-3 h-3" /> Gestão inteligente para barbearias
                </div>
                <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
                  Transforme sua barbearia em um negócio <span className="text-[#1B3A4B]">lucrativo.</span>
                </h1>
                <p className="text-lg text-black/60 mb-8 max-w-lg leading-relaxed">
                  Agendamento online, gestão de clientes, equipe, financeiro e Clube de Assinaturas em uma única plataforma moderna.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="lg" className="bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90 rounded-full px-8 h-14 text-base" onClick={scrollToPlans}>
                    Começar grátis
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-full px-8 h-14 text-base group">
                    Ver como funciona <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                <p className="mt-6 text-sm text-black/40 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 14 dias grátis • Sem compromisso
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative lg:ml-auto w-full lg:max-w-[120%]"
              >
                <div className="relative z-10 rounded-2xl bg-white border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden transition-transform duration-500 hover:scale-[1.02] group">
                  {/* Browser Bar Mockup */}
                  <div className="h-8 sm:h-10 bg-[#F8F7F3] border-b border-black/5 flex items-center px-4 gap-1.5 sm:gap-2 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    <div className="ml-4 h-5 sm:h-6 flex-1 bg-black/5 rounded-md" />
                  </div>
                  
                  {/* Actual Product Image */}
                  <div className="relative overflow-hidden bg-[#F8F7F3] aspect-video sm:aspect-auto">
                    <img 
                      src={dashboardPreview.url} 
                      alt="Dashboard do BarbeiroPro AI mostrando indicadores de agendamentos, faturamento, clientes e desempenho da barbearia"
                      className="w-full h-auto object-top shadow-inner"
                      loading="eager"
                      fetchPriority="high"
                    />
                    
                    {/* Subtle Overlay Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#1B3A4B]/5 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity" />
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#1B3A4B]/10 rounded-full blur-3xl -z-10" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="py-24 sm:py-32 bg-[#F8F7F3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">Tudo o que sua barbearia precisa em um só lugar.</h2>
              <p className="text-lg text-black/60">Esqueça o papel e planilhas confusas. Automatize sua gestão e foque no que importa: seus clientes.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Calendar, title: "Agenda Inteligente", desc: "Agendamento online 24/7 com link exclusivo para sua barbearia." },
                { icon: Users, title: "CRM de Clientes", desc: "Histórico completo, preferências e alertas de clientes sumidos." },
                { icon: TrendingUp, title: "Financeiro Real", desc: "Fluxo de caixa, entradas e saídas integradas aos atendimentos." },
                { icon: Percent, title: "Comissões", desc: "Cálculo automático para seus profissionais sem erros manuais." },
                { icon: ShieldCheck, title: "Clube de Assinaturas", desc: "Crie planos mensais e garanta receita recorrente todos os meses." },
                { icon: Zap, title: "IA Growth", desc: "Inteligência artificial que detecta oportunidades de lucro para você." },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-3xl bg-white border border-black/5 hover:shadow-xl hover:shadow-black/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#1B3A4B]/5 flex items-center justify-center mb-6">
                    <item.icon className="w-6 h-6 text-[#1B3A4B]" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-black/50 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* DEMONSTRAÇÃO VISUAL DO PRODUTO */}
        <ProductShowcase onCtaClick={scrollToPlans} />

        {/* PROBLEMA / SOLUÇÃO */}

        <section className="py-24 sm:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-16">Sua barbearia ainda perde tempo com isso?</h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                "Agenda em caderninho ou WhatsApp bagunçado",
                "Clientes esquecendo horários (no-show)",
                "Fim de mês estressante calculando comissões"
              ].map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-red-50 border border-red-100">
                  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">!</div>
                  <p className="font-medium text-red-900">{p}</p>
                </div>
              ))}
            </div>

            <div className="p-8 sm:p-12 rounded-[2rem] bg-[#1B3A4B] text-white text-left relative overflow-hidden">
              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-bold mb-6">Com o BarbeiroPro, tudo fica em um só lugar.</h3>
                  <div className="space-y-4">
                    {[
                      "Recupere até 30% da receita perdida com no-shows",
                      "Reduza em 90% o tempo gasto com administrativo",
                      "Tenha previsibilidade financeira total"
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-8 bg-white text-[#1B3A4B] hover:bg-white/90 rounded-full px-8 h-12" onClick={scrollToPlans}>
                    Mudar agora
                  </Button>
                </div>
                <div className="min-w-0">
                  <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] transition-transform duration-500 hover:-translate-y-1">
                    <div className="rounded-xl overflow-hidden bg-white">
                      <img
                        src={aiGrowthAsset.url}
                        alt="AI Growth Engine do BarbeiroPro AI mostrando oportunidades de crescimento, clientes inativos, campanhas e impacto financeiro estimado."
                        loading="lazy"
                        decoding="async"
                        className="w-full h-auto block"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="py-24 sm:py-32 bg-[#F8F7F3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">Escolha o plano ideal para crescer.</h2>
              <p className="text-lg text-black/60">14 dias grátis para testar. Sem compromisso.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={cn(
                    "p-8 rounded-[2rem] border transition-all flex flex-col",
                    plan.destaque 
                      ? "bg-white border-[#1B3A4B] shadow-2xl scale-105 relative z-10" 
                      : "bg-white/50 border-black/5"
                  )}
                >
                  {plan.destaque && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#1B3A4B] text-white text-[10px] font-bold tracking-widest uppercase">
                      Mais Escolhido
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-2">{plan.nome}</h3>
                    <p className="text-sm text-black/40 mb-6">{plan.descricao || "Recursos essenciais."}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">R$ {Math.round(plan.preco_cents / 100)}</span>
                      <span className="text-black/40 text-sm">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-10 flex-1">
                    {(plan.features || []).map((f: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-[#1B3A4B]" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className={cn(
                      "w-full rounded-full h-12 font-bold transition-all",
                      plan.destaque 
                        ? "bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90" 
                        : "bg-black/5 text-black hover:bg-black/10"
                    )}
                    onClick={() => handlePlanClick(plan)}
                  >
                    Começar grátis
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 sm:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-5xl sm:text-6xl font-black tracking-tight mb-8">Pronto para levar sua barbearia para o próximo nível?</h2>
            <p className="text-xl text-black/60 mb-12 leading-relaxed">
              Junte-se a milhares de barbearias que já modernizaram sua gestão com o BarbeiroPro AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90 rounded-full px-12 h-14 text-lg" onClick={scrollToPlans}>
                Começar agora
              </Button>
              <Button variant="ghost" size="lg" className="w-full sm:w-auto rounded-full px-12 h-14 text-lg">
                Falar com consultor
              </Button>
            </div>
            <p className="mt-8 text-sm text-black/30">14 dias grátis • Sem cartão • Sem compromisso</p>
          </div>
        </section>
      </main>

      <footer className="bg-[#F8F7F3] pt-20 pb-10 border-t border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#1B3A4B] flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">BarbeiroPro AI</span>
              </div>
              <p className="text-black/50 max-w-sm mb-6 leading-relaxed">
                Sistema inteligente para gestão de barbearias modernas. Otimize sua agenda, fidelize clientes e cresça de forma organizada.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Links</h4>
              <nav className="flex flex-col gap-4 text-sm text-black/50">
                <a href="#recursos" className="hover:text-black transition-colors">Recursos</a>
                <a href="#planos" className="hover:text-black transition-colors">Planos</a>
                <Link to="/cliente/entrar" className="hover:text-black transition-colors">Minha Conta</Link>
                <Link to="/privacidade" className="hover:text-black transition-colors">Privacidade</Link>
                <Link to="/termos" className="hover:text-black transition-colors">Termos de Uso</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-bold mb-6">Contato</h4>
              <nav className="flex flex-col gap-4 text-sm text-black/50">
                <span className="hover:text-black cursor-pointer">suporte@barbeiropro.app</span>
                <span className="hover:text-black cursor-pointer">WhatsApp: (11) 99999-9999</span>
              </nav>
            </div>
          </div>
          <div className="pt-8 border-t border-black/5 text-center text-sm text-black/30">
            © {new Date().getFullYear()} BarbeiroPro AI. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <PlanCheckoutDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
      />
    </div>
  );
}
