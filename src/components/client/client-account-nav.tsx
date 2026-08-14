import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Calendar,
  CreditCard,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signOutClient, useClientProfile, useClientSession } from "@/hooks/use-client-account";
import { toast } from "sonner";

const MENU = [
  { to: "/cliente", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cliente/agendamentos", label: "Meus Agendamentos", icon: Calendar },
  { to: "/cliente/clube", label: "Meu Clube", icon: Crown },
  { to: "/cliente/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/cliente/perfil", label: "Perfil", icon: User },
  { to: "/cliente/notificacoes", label: "Notificações", icon: Bell },
] as const;

function initials(name?: string | null) {
  if (!name) return "CL";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function firstName(name?: string | null) {
  if (!name) return "Cliente";
  return name.trim().split(/\s+/)[0];
}

/**
 * Acesso à Área do Cliente para headers públicos.
 * Deslogado: Entrar / Criar conta. Logado: foto + nome + dropdown.
 * `tone="onColor"` para headers com fundo colorido (página da barbearia).
 */
export function ClientAccountNav({
  tone = "light",
  className,
  signedOutLabel,
}: {
  tone?: "light" | "onColor";
  className?: string;
  /** Quando definido, exibe um único botão com esse texto no estado deslogado. */
  signedOutLabel?: string;
}) {
  const navigate = useNavigate();
  const { session, loading } = useClientSession(null);
  const userId = session?.user?.id;
  const { data: profile } = useClientProfile(userId);
  const [open, setOpen] = useState(false);

  const name =
    (profile?.full_name as string | null) ??
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    session?.user?.email ??
    null;
  const photo =
    (profile?.photo_url as string | null) ??
    (session?.user?.user_metadata?.avatar_url as string | undefined) ??
    null;

  const onColor = tone === "onColor";
  const ghost = onColor
    ? "text-white hover:bg-white/15 hover:text-white"
    : "text-foreground hover:bg-muted";
  const outline = onColor
    ? "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
    : "";

  const logout = async () => {
    await signOutClient();
    setOpen(false);
    toast.success("Você saiu da sua conta");
    navigate({ to: "/" });
  };

  if (loading) {
    return <Skeleton className={cn("h-9 w-28 rounded-md", className)} />;
  }

  if (!session) {
    if (signedOutLabel) {
      return (
        <Button asChild size="sm" variant="outline" className={cn(outline, className)}>
          <Link to="/cliente/entrar">
            <User className="mr-1.5 h-4 w-4" />
            {signedOutLabel}
          </Link>
        </Button>
      );
    }
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button asChild variant="ghost" size="sm" className={cn("hidden sm:inline-flex", ghost)}>
          <Link to="/cliente/entrar">Entrar</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className={outline}>
          <Link to="/cliente/entrar">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Criar conta
          </Link>
        </Button>
      </div>
    );
  }


  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Desktop / tablet: dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("hidden items-center gap-2 pl-1 pr-2 sm:inline-flex", ghost)}
          >
            <Avatar className="h-7 w-7">
              {photo ? <AvatarImage src={photo} alt={name ?? "Cliente"} /> : null}
              <AvatarFallback className="text-[11px]">{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="max-w-[140px] truncate text-sm font-medium">
              Olá, {firstName(name)}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{name ?? "Minha Conta"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MENU.map((item) => (
            <DropdownMenuItem key={item.to} asChild>
              <Link to={item.to} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: menu lateral */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("inline-flex items-center gap-2 sm:hidden", ghost)}
            aria-label="Abrir menu da Área do Cliente"
          >
            <Menu className="h-5 w-5" />
            <Avatar className="h-7 w-7">
              {photo ? <AvatarImage src={photo} alt={name ?? "Cliente"} /> : null}
              <AvatarFallback className="text-[11px]">{initials(name)}</AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {photo ? <AvatarImage src={photo} alt={name ?? "Cliente"} /> : null}
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  Olá, {firstName(name)}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Área do Cliente
                </span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col p-2">
            {MENU.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
