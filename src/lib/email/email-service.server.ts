import { Resend } from "resend";
import { templates, type TemplateName } from "./templates";

const FROM = process.env.EMAIL_FROM ?? "BarbeiroPro <notificacoes@barbeiropro.app>";

export type SendEmailInput<T extends TemplateName = TemplateName> = {
  to: string | string[];
  template: T;
  data?: Record<string, any>;
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada");
  }
  const factory = templates[input.template];
  if (!factory) throw new Error(`Template desconhecido: ${input.template}`);

  const { subject, react } = (factory as any)(input.data ?? {});
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject,
    react,
    replyTo: input.replyTo,
  });

  if (error) {
    throw new Error(`Resend: ${error.message ?? "erro desconhecido"}`);
  }
  return { id: data?.id };
}
