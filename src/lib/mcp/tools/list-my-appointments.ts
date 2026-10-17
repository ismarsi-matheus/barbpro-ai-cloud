import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_appointments",
  title: "Meus agendamentos",
  description: "Consulta uma página dos agendamentos do cliente conectado, do mais recente ao mais antigo, sem alterar reservas.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade de agendamentos, de 1 a 50."),
    offset: z.number().int().min(0).max(10000).default(0).describe("Quantidade de registros a pular para consultar a próxima página."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset }, ctx) => {
    const db = supabaseForUser(ctx);
    const { data, error } = await db.rpc("get_client_appointments").range(offset, offset + limit - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar seus agendamentos. Tente novamente.");
    const appointments = (data ?? []).map((row) => ({
      id: row.id, scheduled_at: row.scheduled_at, status: row.status,
      service: row.service_name, professional: row.professional_name,
      barbershop: row.company_name, price: row.price, payment_type: row.pagamento_tipo,
    }));
    return { content: [{ type: "text", text: JSON.stringify(appointments) }], structuredContent: { appointments, offset, limit } };
  },
});