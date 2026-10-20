import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["owner", "admin", "barbeiro", "recepcao", "financeiro"] as const;
type Role = (typeof ROLES)[number];

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function findUserByEmail(admin: any, email: string): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data?.users.find((x: any) => (x.email ?? "").toLowerCase() === email);
    if (u) return u.id;
    if (!data?.users || data.users.length < 200) return null;
    page += 1;
    if (page > 25) return null;
  }
}

// ===== Master: reset admin (owner) password =====
const ResetAdminSchema = z.object({ company_id: z.string().uuid() });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResetAdminSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Apenas super admin pode resetar senhas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from("company_user")
      .select("id, user_id, email")
      .eq("company_id", data.company_id)
      .eq("role", "owner")
      .eq("ativo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownerErr) throw new Error(ownerErr.message);
    if (!owner?.user_id) throw new Error("Owner não encontrado para esta barbearia.");

    const tempPassword = generateTempPassword();
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(owner.user_id, {
      password: tempPassword,
    });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("company_user")
      .update({ forcar_troca_senha: true })
      .eq("id", owner.id);

    return { email: owner.email, tempPassword };
  });

// ===== Team management (owner/admin of company OR super admin) =====
type CallerRole = "super" | "owner" | "admin";

async function assertCanManageTeam(context: any, companyId: string): Promise<CallerRole> {
  const { data: isAdmin } = await context.supabase.rpc("is_super_admin");
  if (isAdmin) return "super";
  const { data: me, error } = await context.supabase
    .from("company_user")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", context.userId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (me?.role !== "owner" && me?.role !== "admin") {
    throw new Error("Sem permissão para gerenciar a equipe.");
  }
  return me.role;
}

/**
 * Regras sobre o membro alvo: ninguém altera/desativa/remove a si mesmo e
 * só o dono (ou super admin) mexe em quem é dono.
 */
async function assertCanTouchMember(
  context: any,
  caller: CallerRole,
  companyId: string,
  memberId: string,
): Promise<{ id: string; user_id: string | null; email: string | null; role: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: member, error } = await supabaseAdmin
    .from("company_user")
    .select("id, user_id, email, role")
    .eq("id", memberId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) throw new Error("Membro não encontrado.");
  if (caller !== "super" && member.user_id === context.userId) {
    throw new Error("Você não pode alterar o seu próprio acesso.");
  }
  if (member.role === "owner" && caller === "admin") {
    throw new Error("Apenas o dono pode alterar outro dono.");
  }
  return member as any;
}

const CreateMemberSchema = z.object({
  company_id: z.string().uuid(),
  email: z.string().trim().email().max(255),
  nome: z.string().trim().max(200).optional().default(""),
  role: z.enum(ROLES),
  password: z.string().min(6).max(72).optional(),
  generate_password: z.boolean().optional().default(false),
});

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await assertCanManageTeam(context, data.company_id);
    if (data.role === "owner" && caller === "admin") {
      throw new Error("Apenas o dono pode adicionar outro dono.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    let password: string | null = data.password && data.password.length >= 6
      ? data.password
      : generateTempPassword();
    let wasGenerated = !data.password || data.password.length < 6 || data.generate_password === true;

    // Conta já existente (dono de outra barbearia, cliente, etc.): apenas vincula
    // à equipe. Nunca alterar a senha de uma conta que esta empresa não criou.
    let userId = await findUserByEmail(supabaseAdmin, email);
    const existingAccount = !!userId;
    if (existingAccount) {
      password = null;
      wasGenerated = false;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password!,
        email_confirm: true,
        user_metadata: { nome: data.nome || "" },
        app_metadata: { provisioned_by_company: data.company_id },
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Falha ao provisionar usuário.");

    // Já é membro?
    const { data: existing } = await supabaseAdmin
      .from("company_user")
      .select("id")
      .eq("company_id", data.company_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("company_user")
        .update({
          email,
          nome: data.nome || null,
          role: data.role as any,
          ativo: true,
          convite_aceito: true,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("company_user").insert({
        company_id: data.company_id,
        user_id: userId,
        email,
        nome: data.nome || null,
        role: data.role as any,
        ativo: true,
        convite_aceito: true,
        forcar_troca_senha: wasGenerated,
      } as any);
      if (error) throw new Error(error.message);
    }

    return { email, password, generated: wasGenerated, existingAccount };
  });

const UpdateRoleSchema = z.object({
  company_id: z.string().uuid(),
  member_id: z.string().uuid(),
  role: z.enum(ROLES),
});

export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await assertCanManageTeam(context, data.company_id);
    await assertCanTouchMember(context, caller, data.company_id, data.member_id);
    if (data.role === "owner" && caller === "admin") {
      throw new Error("Apenas o dono pode promover alguém a dono.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("company_user")
      .update({ role: data.role as any })
      .eq("id", data.member_id)
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SetActiveSchema = z.object({
  company_id: z.string().uuid(),
  member_id: z.string().uuid(),
  ativo: z.boolean(),
});

export const setTeamMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await assertCanManageTeam(context, data.company_id);
    await assertCanTouchMember(context, caller, data.company_id, data.member_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("company_user")
      .update({ ativo: data.ativo })
      .eq("id", data.member_id)
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ResetMemberSchema = z.object({
  company_id: z.string().uuid(),
  member_id: z.string().uuid(),
  password: z.string().min(6).max(72).optional(),
});

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResetMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await assertCanManageTeam(context, data.company_id);
    const member = await assertCanTouchMember(context, caller, data.company_id, data.member_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!member.user_id) throw new Error("Membro sem conta vinculada.");

    // Só redefine senha de contas criadas por esta empresa; contas próprias
    // (que podem ser donas de outra barbearia ou clientes) usam "Esqueci minha senha".
    const { data: authUser, error: userErr } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
    if (userErr) throw new Error(userErr.message);
    if (authUser.user?.app_metadata?.provisioned_by_company !== data.company_id) {
      throw new Error(
        "Esta pessoa tem uma conta própria. Peça para ela usar \"Esqueci minha senha\" na tela de login.",
      );
    }

    const password = data.password && data.password.length >= 6 ? data.password : generateTempPassword();
    const wasGenerated = !data.password || data.password.length < 6;

    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
      password,
    });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("company_user")
      .update({ forcar_troca_senha: wasGenerated })
      .eq("id", member.id);

    return { email: member.email ?? "", password, generated: wasGenerated };
  });

const RemoveMemberSchema = z.object({
  company_id: z.string().uuid(),
  member_id: z.string().uuid(),
});

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RemoveMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const caller = await assertCanManageTeam(context, data.company_id);
    await assertCanTouchMember(context, caller, data.company_id, data.member_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("company_user")
      .delete()
      .eq("id", data.member_id)
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
