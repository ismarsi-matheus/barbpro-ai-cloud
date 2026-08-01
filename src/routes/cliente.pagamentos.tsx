import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientShell } from "@/components/client/client-shell";
import {
  useClientDashboard,
  useClientPayments,
  useClientSession,
} from "@/hooks/use-client-account";

export const Route = createFileRoute("/cliente/pagamentos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pagamentos — BarbeiroPro" },
      { name: "description", content: "Veja suas cobranças, status e recibos." },
      { property: "og:title", content: "Pagamentos — BarbeiroPro" },
      { property: "og:description", content: "Veja suas cobranças, status e recibos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagamentosPage,
});

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const STATUS: Record<string, { label: string; className: string }> = {
  pago: { label: "Pago", className: "bg-emerald-100 text-emerald-800" },
  succeeded: { label: "Pago", className: "bg-emerald-100 text-emerald-800" },
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800" },
  falhou: { label: "Falhou", className: "bg-destructive/10 text-destructive" },
  reembolsado: { label: "Reembolsado", className: "bg-muted text-muted-foreground" },
};

function PagamentosPage() {
  const { session } = useClientSession();
  const dash = useClientDashboard(session?.user.id);
  const payments = useClientPayments(session?.user.id);

  const nome = dash.data?.profile?.full_name ?? session?.user.email ?? "Cliente";
  const list = payments.data ?? [];
  const totalPago = list
    .filter((p) => ["pago", "succeeded"].includes(p.status))
    .reduce((acc, p) => acc + p.amount_cents, 0);

  return (
    <ClientShell
      title="Pagamentos"
      subtitle="Cobranças, status e recibos"
      user={{ name: nome, email: session?.user.email, photo: dash.data?.profile?.photo_url }}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total pago</p>
              <p className="text-3xl font-bold">{formatBRL(totalPago)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Cobranças registradas</p>
              <p className="text-3xl font-bold">{list.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-[var(--brand)]" /> Suas cobranças
            </CardTitle>
            <CardDescription>Pagamentos processados pela plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Nenhuma cobrança por aqui</p>
                <p className="text-sm text-muted-foreground">
                  Pagamentos feitos no balcão da barbearia não aparecem nesta lista.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Recibo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((p) => {
                      const st = STATUS[p.status] ?? {
                        label: p.status,
                        className: "bg-muted text-muted-foreground",
                      };
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(p.paid_at ?? p.created_at), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{p.descricao}</div>
                            {p.company_name ? (
                              <div className="text-xs text-muted-foreground">{p.company_name}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {p.card_brand
                              ? `${p.card_brand.toUpperCase()} •••• ${p.card_last4 ?? ""}`
                              : (p.metodo ?? "—")}
                          </TableCell>
                          <TableCell>
                            <Badge className={st.className}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatBRL(p.amount_cents)}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.receipt_url ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={p.receipt_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientShell>
  );
}
