import { createFileRoute } from "@tanstack/react-router";

// Cron-safe reminder dispatcher.
// Call every 15 minutes from an external scheduler:
//   POST https://barbeiropro.app/api/public/cron/appointment-reminders
//   x-test-token: <EMAIL_TEST_TOKEN>
// Sends "agendamento-lembrete" for appointments starting in the next 24h (± window).
export const Route = createFileRoute("/api/public/cron/appointment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-test-token") ?? new URL(request.url).searchParams.get("token");
        const expected = process.env.EMAIL_TEST_TOKEN;
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const notify = await import("@/lib/email/notify.server");

        const url = new URL(request.url);
        const oneId = url.searchParams.get("appointment_id");
        const kind = (url.searchParams.get("kind") ?? "reminder") as "created" | "canceled" | "reminder";

        // Disparo pontual (retry / teste)
        if (oneId) {
          let r: any;
          if (kind === "created") r = await notify.notifyAppointmentCreated(oneId);
          else if (kind === "canceled") r = await notify.notifyAppointmentCanceled(oneId);
          else r = await notify.notifyAppointmentReminder(oneId);
          return Response.json({ ok: true, mode: "single", kind, result: r });
        }

        const now = new Date();
        const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25 = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        // Grab appointments starting between 24h and 25h from now (1h window).
        const { data: apts, error } = await supabaseAdmin
          .from("appointment")
          .select("id, status")
          .gte("scheduled_at", in24.toISOString())
          .lt("scheduled_at", in25.toISOString())
          .in("status", ["agendado", "confirmado"]);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: any[] = [];
        for (const a of apts ?? []) {
          const r = await notify.notifyAppointmentReminder(a.id);
          results.push({ id: a.id, ...r });
        }
        return Response.json({ ok: true, count: results.length, results });
      },
    },
  },
});
