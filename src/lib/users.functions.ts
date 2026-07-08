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

// ===== Self-service signup (no email confirmation) =====
const SignUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  nome: z.string().trim().max(200).optional().default(""),
});

// Limite simples em memória: 5 tentativas / 10 min por email (anti-spam)
const _signupAttempts = new Map<string, number[]>();
function checkSignupRate(email: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (_signupAttempts.get(email) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= 5) throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  list.push(now);
  _signupAttempts.set(email, list);
}

export const signUpInterno = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignUpSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    checkSignupRate(email);

    const existing = await findUserByEmail(supabaseAdmin, email);
    if (existing) throw new Error("Já existe uma conta com este email. Entre com sua senha.");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome || "" },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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
async function assertCanManageTeam(context: any, companyId: string) {
  const { data: isAdmin } = await context.supabase.rpc("is_super_admin");
  if (isAdmin) return;
  const { data: ok, error } = await context.supabase.rpc("has_company_role", {
    _company_id: companyId,
    _roles: ["owner", "admin"],
  });
  if (error) throw new Error(error.message);
  if (!ok) throw new Error("Sem permissão para gerenciar a equipe.");
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
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const password = data.password && data.password.length >= 6
      ? data.password
      : generateTempPassword();
    const wasGenerated = !data.password || data.password.length < 6 || data.generate_password === true;

    let userId = await findUserByEmail(supabaseAdmin, email);
    if (userId) {
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (upErr) throw new Error(upErr.message);
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome: data.nome || "" },
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
          forcar_troca_senha: wasGenerated,
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

    return { email, password, generated: wasGenerated };
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
    await assertCanManageTeam(context, data.company_id);
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
    await assertCanManageTeam(context, data.company_id);
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
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member, error } = await supabaseAdmin
      .from("company_user")
      .select("id, user_id, email")
      .eq("id", data.member_id)
      .eq("company_id", data.company_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member?.user_id) throw new Error("Membro sem conta vinculada.");

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

    return { email: member.email, password, generated: wasGenerated };
  });

const RemoveMemberSchema = z.object({
  company_id: z.string().uuid(),
  member_id: z.string().uuid(),
});

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RemoveMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("company_user")
      .delete()
      .eq("id", data.member_id)
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
