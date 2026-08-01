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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = pathname.startsWith("/cliente/entrar");
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
