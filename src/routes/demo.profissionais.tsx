import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { UserCircle, DollarSign, Percent } from "lucide-react";
import { demoProfessionals, demoServices } from "@/lib/demo-data";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/demo/profissionais")({ component: DemoProf });

function DemoProf() {
  const [open, setOpen] = useState<typeof demoProfessionals[number] | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Profissionais" description="Cadastro, comissões e desempenho" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoProfessionals.map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-[var(--brand)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.specialty}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {p.commission_type === "percent"
                      ? <><Percent className="w-3 h-3 mr-1" />{p.commission_value}%</>
                      : <><DollarSign className="w-3 h-3 mr-1" />Fixo {formatBRL(p.commission_value)}</>}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Faturamento do mês</p>
                  <p className="font-bold text-[var(--brand)]">{formatBRL(p.faturamento_mes)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpen(p)}>
                  Comissões
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Comissões por serviço</SheetTitle>
            <SheetDescription>{open?.name}</SheetDescription>
          </SheetHeader>
          {open && (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoServices.filter((s) => open.service_ids.includes(s.id)).map((s) => {
                  const comm = open.commission_type === "percent"
                    ? s.price * (open.commission_value / 100)
                    : open.commission_value;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{formatBRL(s.price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(comm)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
