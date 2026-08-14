import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useClientSession } from "@/hooks/use-client-account";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  component: ClienteLayout,
});

/**
 * Layout do módulo Área do Cliente.
 * Faz o gate de sessão para todas as telas, exceto a de autenticação (/cliente/entrar).
 */
function ClienteLayout() {
  // Usa as matches confirmadas (e não o pathname "pendente") para decidir o gate.
  // Com o pathname, ao navegar para fora de /cliente/entrar o hook passava a
  // receber redirectTo e devolvia o usuário para /cliente/entrar (nav travada).
  const isAuthRoute = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/cliente/entrar"),
  });
  const { session, loading } = useClientSession(isAuthRoute ? null : "/cliente/entrar");

  if (isAuthRoute) return <Outlet />;

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[var(--surface)] p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}
