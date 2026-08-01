import { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CreditCard,
  Crown,
  History,
  Home,
  LogOut,
  Scissors,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { signOutClient } from "@/hooks/use-client-account";
import { toast } from "sonner";

export const CLIENT_NAV = [
  { to: "/cliente", label: "Início", icon: Home, exact: true },
  { to: "/cliente/agendamentos", label: "Agendamentos", icon: Calendar, exact: false },
  { to: "/cliente/historico", label: "Histórico", icon: History, exact: false },
  { to: "/cliente/clube", label: "Clube", icon: Crown, exact: false },
  { to: "/cliente/notificacoes", label: "Notificações", icon: Bell, exact: false },
  { to: "/cliente/pagamentos", label: "Pagamentos", icon: CreditCard, exact: false },
  { to: "/cliente/perfil", label: "Perfil", icon: User, exact: false },
  { to: "/cliente/configuracoes", label: "Configurações", icon: Settings, exact: false },
] as const;

const MOBILE_NAV = CLIENT_NAV.filter((i) =>
  ["/cliente", "/cliente/agendamentos", "/cliente/clube", "/cliente/perfil"].includes(i.to),
);

function initials(name?: string | null) {
  if (!name) return "CL";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientShell({
  children,
  title,
  subtitle,
  actions,
  user,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  user?: { name?: string | null; email?: string | null; photo?: string | null };
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const logout = async () => {
    await signOutClient();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/cliente/entrar", replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-foreground">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Sidebar exclusiva do cliente (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background lg:flex">
          <div className="flex items-center gap-2 border-b px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">BarbeiroPro</div>
              <div className="text-xs text-muted-foreground">Área do Cliente</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {CLIENT_NAV.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--brand)] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar className="h-9 w-9">
                {user?.photo ? <AvatarImage src={user.photo} alt={user?.name ?? "Cliente"} /> : null}
                <AvatarFallback>{initials(user?.name ?? user?.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium">{user?.name ?? "Cliente"}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {actions}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={logout}
                  aria-label="Sair da conta"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>

      {/* Navegação inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-[var(--brand)]" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
