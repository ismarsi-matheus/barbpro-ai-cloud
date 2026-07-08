import { addDays, subDays, format } from "date-fns";

const today = new Date();
const iso = (d: Date) => d.toISOString();
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const demoCompany = {
  id: "demo-company",
  name: "Barbearia Excellence",
  nome_fantasia: "Barbearia Excellence",
  razao_social: "Excellence Cortes Masculinos LTDA",
  slug: "barbearia-excellence",
  cnpj: "12.345.678/0001-90",
  telefone_comercial: "(11) 4002-8922",
  whatsapp: "(11) 99876-5432",
  email_contato: "contato@barbeariaexcellence.com.br",
  primary_color: "#1B3A4B",
  logo_url: "",
  plano: "profissional",
  status_cobranca: "ativo",
  ciclo: "mensal",
  valor_mensal: 197,
  trial_ate: ymd(addDays(today, 9)),
  endereco: { rua: "Rua Augusta, 1500", bairro: "Consolação", cidade: "São Paulo", estado: "SP", cep: "01304-001" },
  business_hours: {
    seg: { open: "09:00", close: "20:00" }, ter: { open: "09:00", close: "20:00" },
    qua: { open: "09:00", close: "20:00" }, qui: { open: "09:00", close: "21:00" },
    sex: { open: "09:00", close: "21:00" }, sab: { open: "08:00", close: "18:00" }, dom: null,
  },
};

export const demoCategories = [
  { id: "cat1", name: "Corte", sort_order: 1 },
  { id: "cat2", name: "Barba", sort_order: 2 },
  { id: "cat3", name: "Combo", sort_order: 3 },
  { id: "cat4", name: "Estética", sort_order: 4 },
];

export const demoServices = [
  { id: "s1", category_id: "cat1", name: "Corte Masculino", description: "Corte com tesoura e máquina", price: 55, duration_minutes: 30, featured: true },
  { id: "s2", category_id: "cat1", name: "Corte Infantil", description: "Para crianças até 10 anos", price: 40, duration_minutes: 25, featured: false },
  { id: "s3", category_id: "cat1", name: "Corte Premium", description: "Atendimento exclusivo + lavagem", price: 85, duration_minutes: 45, featured: false },
  { id: "s4", category_id: "cat2", name: "Barba", description: "Toalha quente + navalha", price: 45, duration_minutes: 25, featured: true },
  { id: "s5", category_id: "cat2", name: "Barba Desenhada", description: "Modelagem com navalha", price: 60, duration_minutes: 35, featured: false },
  { id: "s6", category_id: "cat3", name: "Combo Corte + Barba", description: "Pacote completo", price: 90, duration_minutes: 50, featured: true },
  { id: "s7", category_id: "cat3", name: "Combo Premium", description: "Corte + Barba + Sobrancelha + Hidratação", price: 140, duration_minutes: 80, featured: true },
  { id: "s8", category_id: "cat4", name: "Sobrancelha", description: "Design masculino", price: 20, duration_minutes: 15, featured: false },
  { id: "s9", category_id: "cat4", name: "Pigmentação de Barba", description: "Coloração que dura semanas", price: 95, duration_minutes: 45, featured: false },
  { id: "s10", category_id: "cat4", name: "Hidratação Capilar", description: "Tratamento profundo", price: 50, duration_minutes: 30, featured: false },
  { id: "s11", category_id: "cat4", name: "Coloração", description: "Tinta masculina sem amônia", price: 110, duration_minutes: 60, featured: false },
  { id: "s12", category_id: "cat4", name: "Relaxamento", description: "Para cabelos crespos", price: 130, duration_minutes: 90, featured: false },
];

export const demoProfessionals = [
  { id: "p1", name: "Rafael Souza", specialty: "Especialista em barba e degradê", commission_type: "percent", commission_value: 50, photo_url: "", service_ids: ["s1","s3","s4","s5","s6","s7","s9"], faturamento_mes: 8950 },
  { id: "p2", name: "Carlos Silva", specialty: "Cortes clássicos e infantil", commission_type: "percent", commission_value: 45, photo_url: "", service_ids: ["s1","s2","s3","s6","s10"], faturamento_mes: 7320 },
  { id: "p3", name: "Pedro Henrique", specialty: "Pigmentação e coloração", commission_type: "percent", commission_value: 55, photo_url: "", service_ids: ["s1","s4","s6","s9","s11","s12"], faturamento_mes: 6810 },
  { id: "p4", name: "Marcio Lima", specialty: "Barba terapia e estética", commission_type: "fixed", commission_value: 25, photo_url: "", service_ids: ["s4","s5","s8","s10"], faturamento_mes: 4280 },
  { id: "p5", name: "Lucas Martins", specialty: "Corte premium e hidratação", commission_type: "percent", commission_value: 50, photo_url: "", service_ids: ["s3","s6","s7","s10","s11"], faturamento_mes: 5100 },
];

const customerNames = [
  "João Pereira","Lucas Almeida","Pedro Henrique","Bruno Costa","Felipe Rocha",
  "Gabriel Martins","Thiago Ribeiro","Rodrigo Nunes","Vinicius Dias","Eduardo Pinto",
  "Marcos Vieira","André Oliveira","Diego Carvalho","Renato Barros","Caio Mendes",
  "Igor Fernandes","Hugo Cardoso","Daniel Ramos","Leandro Faria","Otávio Teixeira",
  "Rogério Castro","Wesley Antunes","Samuel Moura","Júnior Macedo","Roberto Pires",
  "Fernando Lopes","Murilo Tavares","Anderson Brito","Ricardo Sales","Vitor Hugo",
  "Mateus Ferraz","Davi Cunha","Henrique Borba","Joaquim Reis","Sérgio Andrade",
];

export const demoCustomers = customerNames.map((name, i) => {
  const tags: string[] = [];
  if (i % 6 === 0) tags.push("vip");
  if (i % 3 === 0) tags.push("recorrente");
  if (i > 28) tags.push("novo");
  if (i % 9 === 0) tags.push("alto_valor");
  const lastDays = i % 5 === 0 ? 65 + (i % 30) : (i % 20);
  const total = 1 + ((i * 3) % 22);
  return {
    id: `c${i + 1}`,
    name,
    phone: `(11) 9${String(1000 + i).padStart(4, "0")}-${String(2000 + i).padStart(4, "0")}`,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@email.com`,
    notes: i % 5 === 0 ? "Prefere atendimento à tarde" : "",
    tags,
    total_appointments: total,
    last_appointment_at: iso(subDays(today, lastDays)),
    ticket_medio: 55 + (i * 7) % 60,
    total_gasto: total * (55 + (i * 7) % 60),
    favorite_service: demoServices[i % demoServices.length].name,
    favorite_professional: demoProfessionals[i % demoProfessionals.length].name,
    status: lastDays > 60 ? "inactive" : "active",
  };
});

const statuses = ["agendado","confirmado","em_atendimento","concluido","cancelado","faltou"] as const;

// Generate ~250 appointments distributed across last 30 + next 14 days
export const demoAppointments = Array.from({ length: 250 }).map((_, i) => {
  const dayOffset = (i % 44) - 30; // -30 .. +13
  const d = addDays(today, dayOffset);
  const hour = 9 + (i % 11);
  const min = (i % 4) * 15;
  d.setHours(hour, min, 0, 0);
  const svc = demoServices[i % demoServices.length];
  const prof = demoProfessionals[i % demoProfessionals.length];
  const cli = demoCustomers[i % demoCustomers.length];
  let status: typeof statuses[number];
  if (d < today) {
    const r = i % 20;
    if (r === 0) status = "cancelado";
    else if (r === 1) status = "faltou";
    else status = "concluido";
  } else {
    status = statuses[i % 3];
  }
  return {
    id: `a${i + 1}`,
    scheduled_at: iso(d),
    service_id: svc.id,
    service_name: svc.name,
    professional_id: prof.id,
    professional_name: prof.name,
    customer_id: cli.id,
    customer_name: cli.name,
    customer_phone: cli.phone,
    price: svc.price,
    duration_minutes: svc.duration_minutes,
    status,
    source: i % 3 === 0 ? "online" : "interno",
  };
});

export const demoFinancials = Array.from({ length: 60 }).map((_, i) => {
  const d = subDays(today, i % 35);
  const isIncome = i % 5 !== 0;
  return {
    id: `f${i + 1}`,
    date: ymd(d),
    type: isIncome ? "entrada" : "saida",
    category: isIncome
      ? ["Atendimento","Produto","Outros"][i % 3]
      : ["Aluguel","Produto/Insumos","Equipamento","Marketing","Folha","Outros"][i % 6],
    description: isIncome ? "Serviços do dia" : ["Aluguel mensal","Produtos linha barba","Cadeira nova","Anúncio Instagram","Pagamento equipe","Material limpeza"][i % 6],
    amount: isIncome ? 380 + (i * 47) % 920 : 180 + (i * 53) % 1400,
    status: "confirmado",
  };
});

export const demoTeamMembers = [
  { id: "t1", nome: "Você (Owner)", email: "owner@excellence.com", role: "owner", ativo: true, ultimo_login: iso(today) },
  { id: "t2", nome: "Ana Recepção", email: "ana@excellence.com", role: "recepcao", ativo: true, ultimo_login: iso(subDays(today, 1)) },
  { id: "t3", nome: "Bruno Admin", email: "bruno@excellence.com", role: "admin", ativo: true, ultimo_login: iso(today) },
  { id: "t4", nome: "Camila Financeiro", email: "camila@excellence.com", role: "financeiro", ativo: true, ultimo_login: iso(subDays(today, 3)) },
  { id: "t5", nome: "Diego Auxiliar", email: "diego@excellence.com", role: "recepcao", ativo: false, ultimo_login: iso(subDays(today, 30)) },
];

export const demoAIInsights = [
  {
    id: "ai1",
    type: "reativacao",
    priority: "alta",
    icon: "star",
    title: "8 clientes VIP sem retorno há +21 dias",
    description: "Esses clientes gastaram juntos R$ 4.200 nos últimos 6 meses. Disparar campanha de reativação pode recuperar até R$ 2.400 esse mês.",
    impact_estimate: 2400,
    action_label: "Disparar campanha WhatsApp",
    whatsapp_message: "Olá {nome}! 🌟 Faz tempo que você não passa por aqui no Studio Excellence! Como tão as coisas? Tenho horário livre essa semana se quiser garantir o seu lugar. Cuida bem da sua barba! 💈",
    targets: ["João Pereira", "Marcos Vieira", "Renato Barros", "Fernando Lopes", "Henrique Borba", "Rogério Castro", "Ricardo Sales", "Sérgio Andrade"],
  },
  {
    id: "ai2",
    type: "ocupacao",
    priority: "media",
    icon: "clock",
    title: "Segunda 14h-15h sem agendamentos nas últimas 4 semanas",
    description: "Horário com 0 agendamentos no último mês. Considere oferecer 15% off para preencher.",
    impact_estimate: 580,
    action_label: "Criar promoção pontual",
    whatsapp_message: "🔥 PROMO RELÂMPAGO! Toda segunda 14h-15h com 15% OFF em corte + barba. Vagas limitadas. Confirma seu horário: link.barbeariaexcellence.com",
  },
  {
    id: "ai3",
    type: "demanda",
    priority: "media",
    icon: "sparkles",
    title: "Hidratação Capilar com apenas 2 vendas no mês",
    description: "Serviço com baixa adesão. Oferecer como combo com Corte Premium pode dobrar a saída.",
    impact_estimate: 720,
    action_label: "Criar combo Corte+Hidratação",
  },
  {
    id: "ai4",
    type: "reativacao",
    priority: "alta",
    icon: "user-x",
    title: "30 clientes inativos há +60 dias",
    description: "Base de clientes que não voltaram. Mensagem personalizada via WhatsApp pode reativar 20%.",
    impact_estimate: 1850,
    action_label: "Disparar reativação em massa",
    whatsapp_message: "Olá {nome}! Sentimos sua falta na Excellence. 🙌 Que tal voltar com 20% OFF no próximo corte? Válido até sexta. Agenda aqui: link.barbeariaexcellence.com",
  },
  {
    id: "ai5",
    type: "performance",
    priority: "media",
    icon: "alert-circle",
    title: "Marcio Lima com taxa cancelamento 18%",
    description: "Cancelamentos concentrados às quartas. Conversar com o profissional ou revisar agenda.",
    impact_estimate: 420,
    action_label: "Ver agenda do profissional",
  },
];

export function demoKpis() {
  // Hardcoded realistic numbers so the demo feels like a real-running shop.
  return {
    todayAppointments: 18,
    weekAppointments: 142,
    monthAppointments: 487,
    faturamentoMes: 32400,
    monthIncome: 32400,
    monthExp: 8500,
    ticketMedio: 67,
    activeCustomers: 248,
    taxaOcupacao: 0.78,
    noShowRate: 0.05,
  };
}

export function demoTopServices() {
  const counts = new Map<string, number>();
  demoAppointments.forEach((a) => counts.set(a.service_name, (counts.get(a.service_name) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export function demoWeeklyChart() {
  // Realistic 14-day pattern with weekend peaks
  const today0 = new Date(); today0.setHours(0,0,0,0);
  return Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(today0, 13 - i);
    const day = format(d, "dd/MM");
    const dow = d.getDay();
    const base = dow === 0 ? 0 : dow === 6 ? 28 : dow === 5 ? 24 : 14 + (i % 5);
    return { day, count: base + (i % 4) };
  });
}

export function demoRevenueChart6m() {
  return [
    { month: "Jun", value: 27800 },
    { month: "Jul", value: 29400 },
    { month: "Ago", value: 31200 },
    { month: "Set", value: 30100 },
    { month: "Out", value: 33800 },
    { month: "Nov", value: 32400 },
  ];
}
