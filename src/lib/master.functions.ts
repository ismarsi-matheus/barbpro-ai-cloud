import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const EnderecoSchema = z
  .object({
    cep: z.string().max(20).optional().default(""),
    logradouro: z.string().max(200).optional().default(""),
    numero: z.string().max(20).optional().default(""),
    complemento: z.string().max(100).optional().default(""),
    bairro: z.string().max(100).optional().default(""),
    cidade: z.string().max(100).optional().default(""),
    uf: z.string().max(2).optional().default(""),
  })
  .partial()
  .default({});

const BusinessHoursSchema = z
  .record(
    z.string(),
    z.object({
      open: z.boolean(),
      from: z.string().max(5).optional().default(""),
      to: z.string().max(5).optional().default(""),
    })
  )
  .default({});

const InputSchema = z.object({
  // identificação
  name: z.string().trim().min(1).max(200),
  nome_fantasia: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(20).optional().default(""),
  logo_url: z.string().trim().max(500).optional().default(""),
  // contato
  email_contato: z.string().trim().email().max(255),
  telefone_comercial: z.string().trim().max(40).optional().default(""),
  whatsapp: z.string().trim().max(40).optional().default(""),
  endereco: EnderecoSchema,
  // página pública
  slug: z.string().trim().max(80).optional().default(""),
  primary_color: z.string().trim().max(20).optional().default("#1B3A4B"),
  // horários
  business_hours: BusinessHoursSchema,
  // plano e cobrança
  plano: z.enum(["starter", "pro", "premium"]).default("starter"),
  ciclo: z.enum(["mensal", "anual"]).default("mensal"),
  valor_mensal: z.number().min(0).max(99999).default(49),
  status_cobranca: z
    .enum(["trial", "ativo", "inadimplente", "suspenso", "cancelado"])
    .default("trial"),
  trial_ate: z.string().trim().max(20).optional().default(""),
  // admin
  nome_admin: z.string().trim().max(200).optional().default(""),
  email_admin: z.string().trim().email().max(255),
});

export const createBarbershopWithOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Apenas super admin pode cadastrar barbearias.");

    const email = data.email_admin.toLowerCase();
    const slug = data.slug || slugify(data.nome_fantasia || data.name);

    // valida unicidade do slug
    const { data: existingSlug } = await supabaseAdmin
      .from("company")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existingSlug) throw new Error(`Slug "${slug}" já está em uso. Escolha outro.`);

    let userId: string | null = null;
    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome: data.nome_admin || data.nome_fantasia || data.name },
    });

    if (createErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!existing) throw new Error(createErr.message);
      userId = existing.id;
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: tempPassword,
        email_confirm: true,
      });
      if (upErr) throw new Error(upErr.message);
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Falha ao provisionar usuário.");

    const { data: company, error: companyErr } = await supabaseAdmin
      .from("company")
      .insert({
        name: data.name,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj || null,
        logo_url: data.logo_url || null,
        email_contato: data.email_contato.toLowerCase(),
        telefone_comercial: data.telefone_comercial || null,
        whatsapp: data.whatsapp || null,
        endereco: data.endereco as any,
        slug,
        primary_color: data.primary_color || "#1B3A4B",
        business_hours: data.business_hours as any,
        plano: data.plano,
        ciclo: data.ciclo,
        valor_mensal: data.valor_mensal,
        status_cobranca: data.status_cobranca,
        trial_ate: data.trial_ate || null,
        created_by: userId,
        onboarding_concluido: true,
        onboarding_step: 5,
      } as any)
      .select("id, slug")
      .single();
    if (companyErr) throw new Error(companyErr.message);

    const { error: linkErr } = await supabaseAdmin.from("company_user").insert({
      company_id: company.id,
      user_id: userId,
      email,
      nome: data.nome_admin || data.nome_fantasia || data.name,
      role: "owner",
      ativo: true,
      convite_aceito: true,
      forcar_troca_senha: true,
    } as any);
    if (linkErr) throw new Error(linkErr.message);

    return {
      companyId: company.id,
      slug: company.slug,
      email,
      tempPassword,
    };
  });

const EmailsSchema = z.object({
  emails: z.array(z.string().trim().email().max(255)).max(50),
});

export const setSuperAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmailsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Apenas super admin pode alterar a lista.");

    const normalized = Array.from(new Set(data.emails.map((e) => e.toLowerCase())));

    // Garante que app_config existe e atualiza
    const { data: existing } = await supabaseAdmin
      .from("app_config")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("app_config")
        .update({ super_admin_emails: normalized })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("app_config")
        .insert({ app_name: "BarbeiroPro AI", super_admin_emails: normalized });
      if (error) throw new Error(error.message);
    }

    // Para cada email já com conta, promove no user_roles (paginado)
    if (normalized.length > 0) {
      const allUsers: any[] = [];
      let page = 1;
      for (;;) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        allUsers.push(...(list?.users ?? []));
        if (!list?.users || list.users.length < 200) break;
        page += 1;
        if (page > 25) break;
      }
      const promoted: string[] = [];
      for (const email of normalized) {
        const user = allUsers.find((u) => (u.email ?? "").toLowerCase() === email);
        if (!user) continue;
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: user.id, role: "super_admin" as any }, { onConflict: "user_id,role" });
        promoted.push(email);
      }
      return { ok: true, total: normalized.length, promoted };
    }

    return { ok: true, total: 0, promoted: [] as string[] };
  });

const AppBrandSchema = z.object({
  app_name: z.string().trim().min(1).max(120),
  primary_color: z.string().trim().max(20).optional().default(""),
});

export const setAppBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AppBrandSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Apenas super admin pode alterar a marca.");

    const { data: existing } = await supabaseAdmin
      .from("app_config")
      .select("id, system_settings")
      .limit(1)
      .maybeSingle();

    const newSettings = {
      ...((existing?.system_settings as any) ?? {}),
      primary_color: data.primary_color || (existing?.system_settings as any)?.primary_color || "",
    };

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("app_config")
        .update({ app_name: data.app_name, system_settings: newSettings })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("app_config")
        .insert({ app_name: data.app_name, super_admin_emails: [], system_settings: newSettings });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });
