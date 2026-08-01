import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSaveReview, type ClientAppointment } from "@/hooks/use-client-account";

export function ReviewDialog({
  appointment,
  userId,
  open,
  onOpenChange,
}: {
  appointment: ClientAppointment | null;
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const save = useSaveReview();

  useEffect(() => {
    if (appointment) {
      setRating(appointment.rating ?? 5);
      setComment(appointment.review_comment ?? "");
    }
  }, [appointment]);

  if (!appointment) return null;

  const submit = async () => {
    if (comment.length > 500) return toast.error("Comentário muito longo (máx. 500 caracteres).");
    try {
      await save.mutateAsync({ appointment, userId, rating, comment: comment.trim() });
      toast.success("Obrigado pela sua avaliação!");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a avaliação.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar atendimento</DialogTitle>
          <DialogDescription>
            {appointment.service_name} com {appointment.professional_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                className="p-1 transition hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Conte como foi o atendimento (opcional)"
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Enviar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
