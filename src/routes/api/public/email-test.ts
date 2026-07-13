import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/email-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-test-token");
        const expected = process.env.EMAIL_TEST_TOKEN;
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: { to?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
          return new Response("Invalid email", { status: 400 });
        }
        try {
          const { sendEmail } = await import("@/lib/email/email-service.server");
          const res = await sendEmail({ to: body.to, template: "teste" });
          return Response.json({ ok: true, id: res.id });
        } catch (e: any) {
          console.error("email-test failed", e);
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
    },
  },
});
