import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_club_usage",
  title: "Histórico de créditos do Clube",
  description: "Consulta os movimentos de créditos pertencentes ao cliente conectado, sem consumir créditos nem alterar assinaturas.",
  inputSchema: {
    membership_id: z.string().uuid().optional().describe("ID opcional de uma assinatura pertencente ao cliente conectado."),
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade de movimentos, de 1 a 50."),
    offset: z.number().int().min(0).max(10000).default(0).describe("Quantidade de movimentos a pular."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ membership_id, limit, offset }, ctx) => {
    const db = supabaseForUser(ctx);
    const { data, error } = await db.rpc("get_my_club_usage", { _club_member_id: membership_id })
      .range(offset, offset + limit - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar seu histórico do Clube. Tente novamente.");
    const usage = (data ?? []).map((row) => ({
      id: row.id, membership_id: row.club_member_id, at: row.created_at,
      movement: row.movimento, quantity: row.quantidade,
      plan: row.plano_nome, barbershop: row.company_name, service: row.service_name,
    }));
    return { content: [{ type: "text", text: JSON.stringify(usage) }], structuredContent: { usage, offset, limit } };
  },
});