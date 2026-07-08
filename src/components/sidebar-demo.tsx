import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Users, Scissors, UserCog, DollarSign,
  Briefcase, BarChart3, Sparkles, Settings,
} from "lucide-react";

const GROUPS = [
  {
    label: "Principal",
    items: [
      { to: "/demo/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/demo/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/demo/clientes", label: "Clientes", icon: Users },
      { to: "/demo/servicos", label: "Serviços", icon: Scissors },
      { to: "/demo/profissionais", label: "Profissionais", icon: UserCog },
    ],
  },
  {
    label: "Operacional",
    items: [
      { to: "/demo/financeiro", label: "Financeiro", icon: DollarSign },
      { to: "/demo/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/demo/aigrowth", label: "AI Growth", icon: Sparkles, badge: "IA" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/demo/equipe", label: "Equipe", icon: Briefcase },
      { to: "/demo/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function SidebarDemo() {
  const location = useLocation();
  return (
    <aside
      className="w-60 shrink-0 min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--sidebar-bg)", color: "var(--sidebar-bg-foreground)" }}
    >
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Barbearia Excellence</p>
            <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Modo demonstração</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-white/40 font-semibold">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = location.pathname === it.to;
                return (
                  <Link
                    key={it.to}
                    to={it.to as any}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <it.icon className="w-4 h-4" />
                    <span className="flex-1">{it.label}</span>
                    {(it as any).badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand)] text-white font-semibold">
                        {(it as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link
          to="/entrar"
          search={{ tab: "signup" }}
          className="block text-center w-full px-3 py-2 rounded-md text-sm bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90"
        >
          Criar minha conta
        </Link>
      </div>
    </aside>
  );
}
