import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { demoCompany } from "@/lib/demo-data";

export function BookingLinkCardDemo({ className = "" }: { className?: string }) {
  const publicUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/agendar/${demoCompany.slug}`;
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  return (
    <Card className={`border-[var(--brand)]/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Seu link de agendamento online</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-mono text-[var(--brand)] break-all bg-muted/50 rounded-md px-3 py-2">
          {publicUrl}
        </p>

        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1 bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Copy className="w-4 h-4 mr-2" />
            Copiar link
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-[var(--brand)]/30 text-[var(--brand)] hover:bg-[var(--brand)]/5"
            onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-white rounded-xl border border-border/60">
            <QRCodeSVG value={publicUrl} size={160} level="M" includeMargin={false} />
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Compartilhe esse link ou QR Code com seus clientes para receberem agendamentos online
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
