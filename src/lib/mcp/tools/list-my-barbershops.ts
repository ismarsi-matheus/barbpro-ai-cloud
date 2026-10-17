import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_barbershops",
  title: "Minhas barbearias",
  description: "Lista as barbearias em que o usuário conectado possui vínculo ativo de equipe, respeitando suas permissões atuais.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de vínculos, de 1 a 50.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const db = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Entre na sua conta para consultar suas barbearias.");
    const { data, error } = await db.from("company_user")
      .select("company_id, role, company(name, nome_fantasia, slug)")
      .eq("user_id", userId).eq("ativo", true).order("company_id").limit(limit).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar suas barbearias. Tente novamente.");
    const barbershops = (data ?? []).map((row) => ({
      id: row.company_id, role: row.role,
      name: row.company?.nome_fantasia || row.company?.name || null,
      slug: row.company?.slug ?? null,
    }));
    return { content: [{ type: "text", text: JSON.stringify(barbershops) }], structuredContent: { barbershops } };
  },
});