import { Scissors, Calendar, Percent, LineChart, Clock, MessageSquare, ArrowRight, Zap, Star, ShieldCheck, TrendingUp, Users, Bell } from "lucide-react";

export const PAINS = [
  { 
    icon: Calendar, 
    title: "Agenda Desorganizada", 
    desc: "Clientes ligando a todo momento, mensagens perdidas e furos na agenda que custam dinheiro." 
  },
  { 
    icon: Clock, 
    title: "No-show Constante", 
    desc: "Clientes esquecem o horário e não avisam. Você fica com a cadeira vazia e prejuízo no bolso." 
  },
  { 
    icon: LineChart, 
    title: "Falta de Dados", 
    desc: "Você não sabe quanto faturou de verdade, qual barbeiro é mais produtivo ou qual serviço dá mais lucro." 
  },
];

export const SOLUTIONS = [
  {
    icon: Calendar,
    title: "Agendamento Online 24/7",
    desc: "Seu link de agendamento funciona enquanto você dorme. O cliente escolhe o serviço e o horário em segundos."
  },
  {
    icon: Bell,
    title: "Lembretes Automáticos",
    desc: "Reduza faltas em até 80% com notificações automáticas via e-mail e WhatsApp para seus clientes."
  },
  {
    icon: Percent,
    title: "Gestão Financeira e Comissões",
    desc: "Cálculo automático de comissões e fluxo de caixa. Saiba exatamente quanto sua barbearia lucra."
  }
];

export const FEATURES_GRID = [
  { icon: Calendar, title: "Agenda", desc: "Controle total de horários e profissionais." },
  { icon: Users, title: "Clientes", desc: "CRM completo com histórico e preferências." },
  { icon: Scissors, title: "Serviços", desc: "Gestão de catálogo, preços e durações." },
  { icon: TrendingUp, title: "Financeiro", desc: "Entradas, saídas e previsibilidade." },
  { icon: ShieldCheck, title: "Clube", desc: "Planos de assinatura recorrente." },
  { icon: Zap, title: "IA Growth", desc: "Inteligência que ajuda seu negócio a crescer." },
];
