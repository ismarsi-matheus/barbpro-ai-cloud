import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dashboardAsset from "@/assets/dashboard-preview.png.asset.json";
import aiGrowthAsset from "@/assets/ai-growth-preview.png.asset.json";

interface ShowcaseBlockProps {
  title: string;
  text: string;
  bullets: string[];
  image: string;
  alt: string;
  reverse?: boolean;
}

function BrowserFrame({ image, alt }: { image: string; alt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <div className="absolute -inset-6 bg-[#1B3A4B]/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-2xl sm:rounded-3xl border border-black/10 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden transition-shadow duration-500 group-hover:shadow-[0_28px_80px_-24px_rgba(0,0,0,0.32)]">
        <div className="h-9 bg-[#F8F7F3] border-b border-black/5 flex items-center px-4 gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 hidden sm:block text-[11px] text-black/30 font-medium truncate">
            app.barbeiropro.app
          </span>
        </div>
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-auto block"
        />
      </div>
    </motion.div>
  );
}

function ShowcaseBlock({ title, text, bullets, image, alt, reverse }: ShowcaseBlockProps) {
  return (
    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "min-w-0 lg:col-span-5",
          reverse ? "lg:order-2 lg:col-start-8" : "lg:order-1"
        )}
      >
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-4">{title}</h3>
        <p className="text-black/60 leading-relaxed mb-8">{text}</p>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-600" />
              </span>
              <span className="text-sm font-medium text-black/70">{b}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <div className={cn("min-w-0 lg:col-span-7", reverse ? "lg:order-1 lg:col-start-1" : "lg:order-2")}>
        <BrowserFrame image={image} alt={alt} />
      </div>
    </div>
  );
}

export function ProductShowcase({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <section id="demonstracao" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">
            Uma visão completa da sua barbearia
          </h2>
          <p className="text-lg text-black/60 leading-relaxed">
            Tenha em um só lugar os principais indicadores da sua operação e transforme seus dados
            em decisões que ajudam sua barbearia a crescer.
          </p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          <ShowcaseBlock
            title="Tenha o controle da sua operação"
            text="Visualize agendamentos, faturamento, ticket médio, clientes ativos, ocupação e cancelamentos em um único painel."
            bullets={[
              "Agendamentos em tempo real",
              "Faturamento e ticket médio",
              "Clientes ativos",
              "Taxa de ocupação",
              "Indicadores de cancelamento",
            ]}
            image={dashboardAsset.url}
            alt="Dashboard do BarbeiroPro AI mostrando indicadores de agendamentos, faturamento, clientes e desempenho da barbearia."
          />

          <ShowcaseBlock
            reverse
            title="Transforme dados em oportunidades"
            text="O AI Growth Engine identifica oportunidades de crescimento na sua barbearia e mostra ações práticas para recuperar clientes, aumentar o faturamento e melhorar a ocupação."
            bullets={[
              "Identificação de clientes inativos",
              "Oportunidades de recuperação",
              "Campanhas de WhatsApp",
              "Sugestões de promoções",
              "Estimativa de impacto financeiro",
            ]}
            image={aiGrowthAsset.url}
            alt="AI Growth Engine do BarbeiroPro AI mostrando oportunidades de crescimento, clientes inativos, campanhas e impacto financeiro."
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 sm:mt-28 text-center"
        >
          <p className="text-xl sm:text-2xl font-bold tracking-tight mb-6">
            Pronto para transformar sua barbearia?
          </p>
          <Button
            size="lg"
            className="bg-[#1B3A4B] text-white hover:bg-[#1B3A4B]/90 rounded-full px-8 h-14 text-base group"
            onClick={onCtaClick}
          >
            Começar agora
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
