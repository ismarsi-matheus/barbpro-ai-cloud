import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isValidCPF, normalizePhone, onlyDigits } from "./auth-signup.server";

const CheckEmailSchema = z.object({ email: z.string().trim().email().max(255) });

export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckEmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    // Busca paginada
    let page = 1;
    for (;;) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const found = list?.users.find((u: any) => (u.email ?? "").toLowerCase() === email);
      if (found) return { exists: true };
      if (!list?.users || list.users.length < 200) return { exists: false };
      page += 1;
      if (page > 25) return { exists: false };
    }
  });

const SignupTrialSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  nome: z.string().trim().min(2).max(200),
  cpf: z.string().min(11).max(20),
  phone: z.string().min(10).max(20),
  plan_slug: z.string().trim().max(80).optional(),
});

// Rate limit simples em memória
const _attempts = new Map<string, number[]>();
function rateLimit(key: string) {
  const now = Date.now();
  const list = (_attempts.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 5) throw new Error("Muitas tentativas. Aguarde alguns minutos.");
  list.push(now);
  _attempts.set(key, list);
}

export const signupTrial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupTrialSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const cpf = onlyDigits(data.cpf);
    const phone = normalizePhone(data.phone);

    if (!isValidCPF(cpf)) throw new Error("CPF inválido.");
    if (!phone) throw new Error("Telefone inválido. Use DDD + número.");

    rateLimit(email);
    rateLimit(cpf);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Anti-fraude: já existe trial com esses dados?
    const { data: conflict, error: cErr } = await supabaseAdmin.rpc(
      "trial_identity_conflict" as any,
      { _email: email, _cpf: cpf, _phone: phone } as any,
    );
    if (cErr) throw new Error(cErr.message);
    if (conflict) {
      const map: Record<string, string> = {
        email: "Já existe uma conta com este email. Faça login.",
        cpf: "Já existe uma conta cadastrada com este CPF.",
        phone: "Já existe uma conta cadastrada com este telefone.",
      };
      throw new Error(map[conflict as string] ?? "Dados já cadastrados.");
    }

    // 2) Busca plano (se passado)
    let trialDays = 14;
    let planId: string | null = null;
    if (data.plan_slug) {
      const { data: plan } = await supabaseAdmin
        .from("plan")
        .select("id, trial_days")
        .eq("slug", data.plan_slug)
        .eq("ativo", true)
        .maybeSingle();
      if (plan) {
        planId = plan.id;
        if (plan.trial_days && plan.trial_days > 0) trialDays = plan.trial_days;
      }
    }

    // 3) Cria usuário
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, cpf, phone },
    });
    if (createErr) throw new Error(createErr.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao criar usuário.");

    // 4) Cria company com trial
    const trialAte = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: company, error: companyErr } = await supabaseAdmin
      .from("company")
      .insert({
        name: data.nome,
        nome_fantasia: data.nome,
        email_contato: email,
        telefone_comercial: phone,
        cpf_responsavel: cpf,
        status_cobranca: "trial" as any,
        trial_ate: trialAte,
        selected_plan_slug: data.plan_slug ?? null,
        created_by: userId,
      } as any)
      .select("id")
      .single();
    if (companyErr) {
      // rollback do user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(companyErr.message);
    }

    // 5) Vincula owner
    const { error: cuErr } = await supabaseAdmin.from("company_user").insert({
      company_id: company.id,
      user_id: userId,
      email,
      nome: data.nome,
      role: "owner" as any,
      ativo: true,
      convite_aceito: true,
      forcar_troca_senha: false,
    } as any);
    if (cuErr) {
      await supabaseAdmin.from("company").delete().eq("id", company.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(cuErr.message);
    }

    // 6) Cria subscription trial (se houver plano)
    if (planId) {
      await supabaseAdmin.from("subscription").insert({
        company_id: company.id,
        plan_id: planId,
        status: "trialing",
        buyer_email: email,
        trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      } as any);
    }

    // 7) Registra identity (lock anti-fraude)
    const { error: tiErr } = await supabaseAdmin.from("trial_identity").insert({
      user_id: userId,
      company_id: company.id,
      email,
      cpf,
      phone,
    } as any);
    if (tiErr) {
      // Não deleta os outros — apenas avisa; lock é best-effort
      console.error("trial_identity insert failed:", tiErr.message);
    }

    return { ok: true, company_id: company.id, trial_ate: trialAte };
  });
