import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, Scissors, Calendar, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/confirmar/$token")({
  ssr: false,
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [acted, setActed] = useState<"confirmed" | "cancelled" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["confirm-token", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_appointment_by_token", { _token: token });
      if (error) throw error;
      return (data as any[])?.[0] ?? null;
    },
  });

  const confirmM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("confirm_appointment_by_token", { _token: token });
      if (error) throw error;
      if (!data) throw new Error("Não foi possível confirmar (já cancelado ou concluído).");
    },
    onSuccess: () => { setActed("confirmed"); qc.invalidateQueries({ queryKey: ["confirm-token", token] }); },
  });

  const cancelM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("cancel_appointment_by_token", { _token: token });
      if (error) throw error;
      if (!data) throw new Error("Não foi possível cancelar.");
    },
    onSuccess: () => { setActed("cancelled"); qc.invalidateQueries({ queryKey: ["confirm-token", token] }); },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">Link inválido</h1>
          <p className="text-sm text-muted-foreground">Não encontramos esse agendamento. Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  const brand = data.company_primary_color || "#1B3A4B";
  const status = data.status as string;
  const finalState =
    acted === "confirmed" || status === "confirmado" ? "confirmed"
    : acted === "cancelled" || status === "cancelado" ? "cancelled"
    : status === "concluido" ? "done"
    : status === "nao_compareceu" ? "missed"
    : "pending";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 text-white" style={{ backgroundColor: brand }}>
          <div className="flex items-center gap-2 mb-2">
            <Scissors className="w-5 h-5" />
            <span className="font-semibold text-lg">{data.company_nome}</span>
          </div>
          <p className="text-white/80 text-sm">Confirmação de agendamento</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {format(parseISO(data.scheduled_at), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-muted-foreground">
                  às {format(parseISO(data.scheduled_at), "HH:mm")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-muted-foreground" />
              <span>{data.service_name} {data.professional_name && `• ${data.professional_name}`}</span>
            </div>
            {data.company_endereco && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /><span>{data.company_endereco}</span>
              </div>
            )}
            {data.company_telefone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" /><span>{data.company_telefone}</span>
              </div>
            )}
          </div>

          {finalState === "confirmed" && (
            <div className="rounded-lg bg-emerald-50 text-emerald-800 p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Presença confirmada. Te esperamos!
            </div>
          )}
          {finalState === "cancelled" && (
            <div className="rounded-lg bg-rose-50 text-rose-800 p-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Agendamento cancelado.
            </div>
          )}
          {finalState === "done" && (
            <div className="rounded-lg bg-slate-100 text-slate-700 p-4 text-sm">Este agendamento já foi atendido.</div>
          )}
          {finalState === "missed" && (
            <div className="rounded-lg bg-slate-100 text-slate-700 p-4 text-sm">Marcado como falta. Procure a barbearia para remarcar.</div>
          )}

          {finalState === "pending" && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => confirmM.mutate()}
                disabled={confirmM.isPending}
                className="w-full py-3 rounded-lg font-semibold text-white shadow disabled:opacity-50"
                style={{ backgroundColor: brand }}
              >
                {confirmM.isPending ? "Confirmando…" : "Confirmar presença"}
              </button>
              <button
                onClick={() => { if (confirm("Tem certeza que quer cancelar?")) cancelM.mutate(); }}
                disabled={cancelM.isPending}
                className="w-full py-3 rounded-lg font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Preciso cancelar
              </button>
              {(confirmM.error || cancelM.error) && (
                <p className="text-xs text-rose-600 text-center">{(confirmM.error as any)?.message ?? (cancelM.error as any)?.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
