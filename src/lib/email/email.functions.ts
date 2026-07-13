import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string }) => {
    if (!data?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.to)) {
      throw new Error("Email inválido");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { sendEmail } = await import("./email-service.server");
    const res = await sendEmail({ to: data.to, template: "teste" });
    return { ok: true, id: res.id };
  });
