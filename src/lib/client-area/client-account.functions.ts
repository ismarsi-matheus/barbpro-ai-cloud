import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Exclusão de conta do cliente (LGPD).
 * Cancela agendamentos futuros, remove o perfil, desvincula os cadastros nas
 * barbearias (preservando o histórico da empresa) e apaga o usuário do Auth.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Cancela horários futuros ainda ativos, um a um, para respeitar as regras
    // de negócio (devolução de crédito do Clube é feita por trigger).
    const { data: futuros } = await supabase.rpc("get_client_appointments");
    const agora = Date.now();
    for (const a of futuros ?? []) {
      const ativo = !["cancelado", "concluido", "nao_compareceu"].includes(a.status);
      if (ativo && new Date(a.scheduled_at).getTime() > agora) {
        await supabase.rpc("cancel_client_appointment", { _appointment_id: a.id });
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("client_profile").delete().eq("user_id", userId);
    await supabaseAdmin.from("customer").update({ user_id: null }).eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
