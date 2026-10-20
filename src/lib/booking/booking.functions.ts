/**
 * Agendamento público (/agendar/$slug).
 *
 * Toda a regra fica na RPC `create_public_booking` (preço, status, validação de
 * serviço/profissional/horário e Clube na mesma transação). Esta função apenas
 * repassa a identidade de quem chamou e envia o e-mail de confirmação pelo
 * servidor — o navegador não dispara e-mails.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BookingInput = z.object({
  companyId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  clubMemberId: z.string().uuid().optional(),
});

export type PublicBookingResult = {
  appointmentId: string;
  pagamentoTipo: "normal" | "clube";
  clubError: string | null;
};

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BookingInput.parse(input))
  .handler(async ({ data }): Promise<PublicBookingResult> => {
    const { supabaseForCaller } = await import("@/lib/supabase-caller.server");
    const supabase = supabaseForCaller();

    const { data: rows, error } = await (supabase as any).rpc("create_public_booking", {
      _company_id: data.companyId,
      _service_id: data.serviceId,
      _professional_id: data.professionalId,
      _scheduled_at: data.scheduledAt,
      _name: data.name,
      _phone: data.phone,
      _email: data.email || null,
      _club_member_id: data.clubMemberId ?? null,
    });
    if (error) throw new Error(error.message);

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.appointment_id) throw new Error("Não foi possível concluir o agendamento.");

    // Nunca lança: falha de e-mail não desfaz o agendamento.
    const { notifyAppointmentCreated } = await import("@/lib/email/notify.server");
    await notifyAppointmentCreated(row.appointment_id);

    return {
      appointmentId: row.appointment_id,
      pagamentoTipo: row.pagamento_tipo === "clube" ? "clube" : "normal",
      clubError: row.club_error ?? null,
    };
  });
