import { createFileRoute } from "@tanstack/react-router";

// Disparo de lembretes (chamar a cada 15 min por um agendador externo):
//   POST https://barbeiropro.app/api/public/cron/appointment-reminders
//   x-cron-secret: <CRON_SECRET>
// Envia "agendamento-lembrete" uma única vez (appointment.reminder_sent_at)
// para agendamentos que começam entre 24h e 25h a partir de agora.

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/cron/appointment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const secret = request.headers.get("x-cron-secret") ?? "";
        if (!expected || !safeEqual(secret, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const notify = await import("@/lib/email/notify.server");
        const admin = supabaseAdmin as any;

        const now = Date.now();
        const in24 = new Date(now + 24 * 60 * 60 * 1000).toISOString();
        const in25 = new Date(now + 25 * 60 * 60 * 1000).toISOString();

        const { data: apts, error } = await admin
          .from("appointment")
          .select("id")
          .gte("scheduled_at", in24)
          .lt("scheduled_at", in25)
          .in("status", ["agendado", "confirmado"])
          .is("reminder_sent_at", null);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: Array<{ id: string; ok: boolean; skipped?: boolean }> = [];
        for (const a of apts ?? []) {
          // Reserva o envio antes de mandar: execuções simultâneas não duplicam.
          const { data: claimed } = await admin
            .from("appointment")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", a.id)
            .is("reminder_sent_at", null)
            .select("id");
          if (!claimed?.length) continue;

          const r: any = await notify.notifyAppointmentReminder(a.id);
          if (r?.ok === false) {
            // Falha no envio: libera para a próxima execução tentar de novo.
            await admin.from("appointment").update({ reminder_sent_at: null }).eq("id", a.id);
          }
          results.push({ id: a.id, ok: r?.ok !== false, skipped: !!r?.skipped });
        }
        return Response.json({ ok: true, count: results.length, results });
      },
    },
  },
});
