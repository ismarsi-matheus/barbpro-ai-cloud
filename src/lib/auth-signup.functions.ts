import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isValidCPF, normalizePhone, onlyDigits } from "./auth-signup.server";

const CheckEmailSchema = z.object({ email: z.string().trim().email().max(255) });

export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckEmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    
    // Check if email exists in auth.users
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    
    const found = list?.users.find((u: any) => (u.email ?? "").toLowerCase() === email);
    return { exists: !!found };
  });

const SignupTrialSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  nome: z.string().trim().min(2).max(200),
  cpf: z.string().min(11).max(20),
  phone: z.string().min(10).max(20),
  plan_slug: z.string().trim().max(80).optional(),
});

export const signupTrial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupTrialSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const cpf = onlyDigits(data.cpf);
    const phone = normalizePhone(data.phone);

    if (!isValidCPF(cpf)) throw new Error("CPF inválido.");
    if (!phone) throw new Error("Telefone inválido. Use DDD + número.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Anti-fraude: check for existing identity
    const { data: conflict } = await supabaseAdmin
      .from("trial_identity")
      .select("id")
      .or(`email.eq.${email},cpf.eq.${cpf},phone.eq.${phone}`)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      throw new Error("Já existe uma conta com esses dados. Faça login ou entre em contato.");
    }

    // 2) Create User
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, cpf, phone },
    });
    if (createErr) throw new Error(createErr.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao criar usuário.");

    // 3) Create Company
    const trialDays = 14; // Default
    const trialAte = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: company, error: companyErr } = await supabaseAdmin
      .from("company")
      .insert({
        name: data.nome,
        nome_fantasia: data.nome,
        email_contato: email,
        telefone_comercial: phone,
        cpf_responsavel: cpf,
        status_cobranca: "trial",
        trial_ate: trialAte,
        created_by: userId,
      } as any)
      .select("id")
      .single();

    if (companyErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(companyErr.message);
    }

    // 4) Create company_user
    const { error: cuErr } = await supabaseAdmin.from("company_user").insert({
      company_id: company.id,
      user_id: userId,
      email,
      nome: data.nome,
      role: "owner",
      ativo: true,
      convite_aceito: true,
      forcar_troca_senha: false,
    } as any);

    if (cuErr) {
      await supabaseAdmin.from("company").delete().eq("id", company.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(cuErr.message);
    }

    // 5) Register identity
    await supabaseAdmin.from("trial_identity").insert({
      user_id: userId,
      company_id: company.id,
      email,
      cpf,
      phone,
    });

    return { ok: true };
  });
