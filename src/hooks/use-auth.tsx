import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  signOut: async () => {},
  refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const computeRoles = async (s: Session | null) => {
    if (!s?.user) {
      setIsSuperAdmin(false);
      return;
    }
    // Checa via RPC (não expõe a lista de e-mails)
    // Super admin é semeado manualmente; nunca promovido pelo client.
    const { data, error } = await supabase.rpc("is_super_admin");
    setIsSuperAdmin(!error && !!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      // defer to avoid deadlock
      setTimeout(() => { computeRoles(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      computeRoles(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isSuperAdmin,
        signOut: async () => {
          await supabase.auth.signOut();
        },
        refreshRoles: () => computeRoles(session),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
