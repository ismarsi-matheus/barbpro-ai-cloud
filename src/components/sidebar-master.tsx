import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Plus, LogOut, ArrowLeft, Shield, Settings, CreditCard, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/master/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/master/listaBarbearias", label: "Barbearias", icon: Building2 },
  { to: "/master/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/master/planos", label: "Planos", icon: Package },
  { to: "/master/novaBarbearia", label: "Nova Barbearia", icon: Plus },
  { to: "/master/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarMaster() {
  const location = useLocation();
  const { signOut } = useAuth();
  return (
    <aside
      className="w-60 shrink-0 min-h-screen flex flex-col text-white"
      style={{ backgroundColor: "hsl(0 70% 22%)" }}
    >
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Master</p>
            <p className="text-[10px] uppercase tracking-wider text-white/60">Super Admin</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map((it) => {
          const active = location.pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to as any}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                active ? "bg-white/15" : "text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </Link>
          );
        })}
        <Link
          to="/app/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-md text-sm text-white/75 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao tenant
        </Link>
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/75 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
