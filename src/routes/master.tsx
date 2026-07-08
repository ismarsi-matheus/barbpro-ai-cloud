import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SidebarMaster } from "@/components/sidebar-master";

export const Route = createFileRoute("/master")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar", search: { tab: "signin" } as any });
    // Guard de super admin no servidor (RPC SECURITY DEFINER)
    const { data: isAdmin, error } = await supabase.rpc("is_super_admin");
    if (error || !isAdmin) throw redirect({ to: "/entrar", search: { tab: "signin" } as any });
  },
  component: MasterLayout,
});

function MasterLayout() {
  const { isSuperAdmin, loading, user } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Give role detection a beat
    const t = setTimeout(() => setChecking(false), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading || checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando acesso…</div>;
  }
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <div className="text-center max-w-md p-8">
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Esta área é exclusiva para super administradores. Seu email ({user?.email}) não tem permissão.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface)]">
      <SidebarMaster />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto"><Outlet /></main>
    </div>
  );
}
