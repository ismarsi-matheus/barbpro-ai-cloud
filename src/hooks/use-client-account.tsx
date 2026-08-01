/**
 * Camada de dados única da Área do Cliente.
 *
 * Todas as telas do módulo /cliente consomem estes hooks — nenhuma tela deve
 * consultar tabelas diretamente, para manter RLS/RPC como único contrato.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ClientAppointment = {
  id: string;
  scheduled_at: string;
  status: string;
  price: number | null;
  notes: string | null;
  pagamento_tipo: string;
  club_member_id: string | null;
  club_plano_nome: string | null;
  club_creditos_restantes: number | null;
  service_id: string | null;
  service_name: string | null;
  duration_minutes: number | null;
  professional_id: string | null;
  professional_name: string | null;
  company_id: string;
  company_name: string | null;
  company_slug: string | null;
  company_endereco: unknown;
  company_whatsapp: string | null;
  company_telefone: string | null;
  rating: number | null;
  review_comment: string | null;
};

export type ClubMembershipSummary = {
  id: string;
  status: string;
  creditos_restantes: number;
  current_period_end: string | null;
  plano_nome: string;
  creditos_mensais: number;
  preco_cents: number;
  company_id: string;
  company_name: string;
};

export type ClientDashboard = {
  profile: {
    full_name: string | null;
    photo_url: string | null;
    phone: string | null;
    email: string | null;
    favorite_company_id: string | null;
    favorite_professional_id: string | null;
    favorite_service_id: string | null;
    favorite_company_name: string | null;
    favorite_company_slug: string | null;
    favorite_professional_name: string | null;
  } | null;
  next_appointment: {
    id: string;
    scheduled_at: string;
    status: string;
    price: number | null;
    pagamento_tipo: string;
    service_name: string | null;
    professional_name: string | null;
    company_name: string | null;
    company_slug: string | null;
    company_endereco: unknown;
    company_whatsapp: string | null;
  } | null;
  last_appointment: {
    id: string;
    scheduled_at: string;
    professional_name: string | null;
    service_name: string | null;
    company_name: string | null;
  } | null;
  club_memberships: ClubMembershipSummary[];
  last_payment: {
    id: string;
    descricao: string;
    amount_cents: number;
    status: string;
    metodo: string | null;
    card_brand: string | null;
    card_last4: string | null;
    receipt_url: string | null;
    paid_at: string | null;
    created_at: string;
  } | null;
  stats: { visitas?: number; total_gasto?: number };
};

export type ClientPayment = {
  id: string;
  descricao: string;
  amount_cents: number;
  status: string;
  metodo: string | null;
  card_brand: string | null;
  card_last4: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
  company_name: string | null;
};

export type ClubUsageEntry = {
  id: string;
  created_at: string;
  movimento: string;
  quantidade: number;
  club_member_id: string;
  plano_nome: string;
  company_name: string;
  appointment_id: string | null;
  appointment_at: string | null;
  service_name: string | null;
};

/** Sessão do cliente. `redirectTo=null` desliga o redirecionamento automático. */
export function useClientSession(redirectTo: string | null = "/cliente/entrar") {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session && redirectTo) {
      navigate({ to: redirectTo, replace: true });
    }
  }, [loading, session, redirectTo, navigate]);

  return { session, loading };
}

export function useClientDashboard(userId?: string) {
  return useQuery({
    queryKey: ["client-dashboard", userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async (): Promise<ClientDashboard> => {
      const { data, error } = await supabase.rpc("get_client_dashboard");
      if (error) throw error;
      return data as unknown as ClientDashboard;
    },
  });
}

export function useClientAppointments(userId?: string) {
  return useQuery({
    queryKey: ["client-appointments", userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async (): Promise<ClientAppointment[]> => {
      const { data, error } = await supabase.rpc("get_client_appointments");
      if (error) throw error;
      return (data ?? []) as unknown as ClientAppointment[];
    },
  });
}

/** Separa agendamentos em futuros e passados/encerrados. */
export function useSplitAppointments(list: ClientAppointment[] | undefined) {
  return useMemo(() => {
    const now = Date.now();
    const all = list ?? [];
    const upcoming = all
      .filter(
        (a) =>
          new Date(a.scheduled_at).getTime() >= now &&
          !["cancelado", "nao_compareceu", "concluido"].includes(a.status),
      )
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const past = all.filter((a) => !upcoming.includes(a));
    return { upcoming, past };
  }, [list]);
}

export function useClientProfile(userId?: string) {
  return useQuery({
    queryKey: ["client-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_profile")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClubUsage(userId?: string, clubMemberId?: string | null) {
  return useQuery({
    queryKey: ["client-club-usage", userId, clubMemberId ?? "all"],
    enabled: !!userId,
    queryFn: async (): Promise<ClubUsageEntry[]> => {
      const { data, error } = await supabase.rpc("get_my_club_usage", {
        _club_member_id: clubMemberId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ClubUsageEntry[];
    },
  });
}

export function useClientPayments(userId?: string) {
  return useQuery({
    queryKey: ["client-payments", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ClientPayment[]> => {
      const { data, error } = await supabase.rpc("get_my_payments");
      if (error) throw error;
      return (data ?? []) as unknown as ClientPayment[];
    },
  });
}

/** Invalida todo o cache do módulo depois de uma ação de escrita. */
export function useInvalidateClientArea() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["client-dashboard"] });
    qc.invalidateQueries({ queryKey: ["client-appointments"] });
    qc.invalidateQueries({ queryKey: ["client-club-usage"] });
    qc.invalidateQueries({ queryKey: ["client-payments"] });
    qc.invalidateQueries({ queryKey: ["client-profile"] });
  };
}

export function useCancelAppointment() {
  const invalidate = useInvalidateClientArea();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase.rpc("cancel_client_appointment", {
        _appointment_id: appointmentId,
      });
      if (error) throw error;
      if (!data) throw new Error("Este agendamento não pode mais ser cancelado.");
      return true;
    },
    onSuccess: invalidate,
  });
}

export function useRescheduleAppointment() {
  const invalidate = useInvalidateClientArea();
  return useMutation({
    mutationFn: async ({ appointmentId, newAt }: { appointmentId: string; newAt: Date }) => {
      const { error } = await supabase.rpc("reschedule_client_appointment", {
        _appointment_id: appointmentId,
        _new_at: newAt.toISOString(),
      });
      if (error) throw error;
      return true;
    },
    onSuccess: invalidate,
  });
}

export function useSaveReview() {
  const invalidate = useInvalidateClientArea();
  return useMutation({
    mutationFn: async (input: {
      appointment: ClientAppointment;
      userId: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase.from("appointment_review").upsert(
        {
          appointment_id: input.appointment.id,
          company_id: input.appointment.company_id,
          user_id: input.userId,
          rating: input.rating,
          comment: input.comment || null,
        },
        { onConflict: "appointment_id" },
      );
      if (error) throw error;
      return true;
    },
    onSuccess: invalidate,
  });
}

export async function signOutClient() {
  await supabase.auth.signOut();
}
