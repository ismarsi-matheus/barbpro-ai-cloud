import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

/** Cancelamento pela área do cliente (regra na RPC) + e-mail de cancelamento. */
export const cancelMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("cancel_client_appointment", {
      _appointment_id: data.appointmentId,
    });
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("Este agendamento não pode mais ser cancelado.");

    const { notifyAppointmentCanceled } = await import("@/lib/email/notify.server");
    await notifyAppointmentCanceled(data.appointmentId);
    return { ok: true };
  });

/** Reagendamento pela área do cliente (regra na RPC) + e-mail com data antiga e nova. */
export const rescheduleMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ appointmentId: z.string().uuid(), newAt: z.string().datetime({ offset: true }) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Lido antes só para o e-mail; a posse é verificada pela RPC abaixo.
    const { data: before } = await supabaseAdmin
      .from("appointment")
      .select("scheduled_at")
      .eq("id", data.appointmentId)
      .maybeSingle();

    const { error } = await context.supabase.rpc("reschedule_client_appointment", {
      _appointment_id: data.appointmentId,
      _new_at: data.newAt,
    });
    if (error) throw new Error(error.message);

    if (before?.scheduled_at) {
      const { notifyAppointmentRescheduled } = await import("@/lib/email/notify.server");
      await notifyAppointmentRescheduled(data.appointmentId, before.scheduled_at);
    }
    return { ok: true };
  });

/** Cancelamento pelo link do e-mail (/confirmar/$token), sem login. */
export const cancelAppointmentByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(16).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseForCaller } = await import("@/lib/supabase-caller.server");
    const { data: ok, error } = await supabaseForCaller().rpc("cancel_appointment_by_token", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("Não foi possível cancelar.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: apt } = await supabaseAdmin
      .from("appointment")
      .select("id")
      .eq("confirm_token", data.token)
      .maybeSingle();
    if (apt?.id) {
      const { notifyAppointmentCanceled } = await import("@/lib/email/notify.server");
      await notifyAppointmentCanceled(apt.id);
    }
    return { ok: true };
  });
