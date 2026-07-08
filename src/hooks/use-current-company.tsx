import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

const IMPERSONATE_KEY = "master_impersonate_company";

export function getImpersonatedCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(IMPERSONATE_KEY);
}

export function clearImpersonation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(IMPERSONATE_KEY);
}

export function useCurrentCompany() {
  const { user, isSuperAdmin } = useAuth();
  const impersonateId = isSuperAdmin ? getImpersonatedCompanyId() : null;

  return useQuery({
    queryKey: ["current-company", user?.id, impersonateId],
    enabled: !!user,
    queryFn: async () => {
      // Super admin com impersonação: carrega a empresa solicitada direto (RLS permite)
      if (impersonateId) {
        const { data: company } = await supabase
          .from("company")
          .select("*")
          .eq("id", impersonateId)
          .maybeSingle();
        if (company) {
          return { ...company, role: "owner" as any, __impersonated: true };
        }
      }

      // Find first company via company_user, then via created_by
      const { data: cu } = await supabase
        .from("company_user")
        .select("company_id, role")
        .eq("user_id", user!.id)
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let companyId = cu?.company_id;
      let role = cu?.role;

      if (!companyId) {
        const { data: owned } = await supabase
          .from("company")
          .select("id")
          .eq("created_by", user!.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        companyId = owned?.id;
        role = "owner" as any;
      }

      if (!companyId) return null;

      const { data: company } = await supabase
        .from("company")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      return company ? { ...company, role } : null;
    },
  });
}
