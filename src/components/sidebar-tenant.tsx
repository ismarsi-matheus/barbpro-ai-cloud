import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Users, Scissors, UserCog, DollarSign,
  Briefcase, BarChart3, Sparkles, Settings, LogOut, Shield, Package, Receipt, Bell, Crown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const GROUPS = [
  {
    label: "Principal",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/app/comandas", label: "Comandas", icon: Receipt },
      { to: "/app/clientes", label: "Clientes", icon: Users },
      { to: "/app/servicos", label: "Serviços", icon: Scissors },
      { to: "/app/produtos", label: "Produtos", icon: Package },
      { to: "/app/profissionais", label: "Profissionais", icon: UserCog },
    ],
  },
  {
    label: "Operacional",
    items: [
      { to: "/app/lembretes", label: "Lembretes", icon: Bell },
      { to: "/app/clube", label: "Clube", icon: Crown },
      { to: "/app/financeiro", label: "Financeiro", icon: DollarSign },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/app/aigrowth", label: "AI Growth", icon: Sparkles, badge: "IA" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/app/equipe", label: "Equipe", icon: Briefcase },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function SidebarTenant({ companyName }: { companyName?: string }) {
  const location = useLocation();
  const { signOut, isSuperAdmin } = useAuth();
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
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{companyName ?? "BarbeiroPro AI"}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/50">Painel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-white/40 font-semibold">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = location.pathname === it.to || location.pathname.startsWith(it.to + "/");
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
        {isSuperAdmin && (
          <Link
            to="/master/painel"
            className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md text-sm bg-red-600/20 text-red-200 hover:bg-red-600/30"
          >
            <Shield className="w-4 h-4" /> Master Panel
          </Link>
        )}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
