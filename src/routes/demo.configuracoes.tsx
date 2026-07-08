import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { demoCompany } from "@/lib/demo-data";
import { BookingLinkCardDemo } from "@/components/booking-link-card-demo";

export const Route = createFileRoute("/demo/configuracoes")({ component: DemoCfg });

function DemoCfg() {
  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" description="Dados da barbearia, branding, horários e cobrança" />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>Nome fantasia</Label><Input defaultValue={demoCompany.nome_fantasia} /></div>
              <div><Label>Razão social</Label><Input defaultValue={demoCompany.razao_social} /></div>
              <div><Label>CNPJ</Label><Input defaultValue={demoCompany.cnpj} /></div>
              <div><Label>Telefone comercial</Label><Input defaultValue={demoCompany.telefone_comercial} /></div>
              <div><Label>WhatsApp</Label><Input defaultValue={demoCompany.whatsapp} /></div>
              <div><Label>Email</Label><Input defaultValue={demoCompany.email_contato} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label><Input defaultValue={`${demoCompany.endereco.rua}, ${demoCompany.endereco.bairro} - ${demoCompany.endereco.cidade}/${demoCompany.endereco.estado}`} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Identidade visual</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl" style={{ background: demoCompany.primary_color }}>
                    {demoCompany.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{demoCompany.name}</p>
                    <p className="text-xs text-muted-foreground">Cor primária: {demoCompany.primary_color}</p>
                  </div>
                </div>
                <div><Label>Cor primária</Label><Input type="color" defaultValue={demoCompany.primary_color} className="w-24 h-10" /></div>
              </CardContent>
            </Card>
            <BookingLinkCardDemo />
          </div>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader><CardTitle className="text-base">Horário de funcionamento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(demoCompany.business_hours).map(([d, h]) => (
                <div key={d} className="flex items-center justify-between p-2 rounded border">
                  <span className="capitalize font-medium">{d}</span>
                  <span className="text-sm text-muted-foreground">{h ? `${h.open} — ${h.close}` : "Fechado"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobranca">
          <Card>
            <CardHeader><CardTitle className="text-base">Plano atual</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded bg-[var(--brand)]/5 border border-[var(--brand)]/20">
                <div>
                  <p className="font-semibold capitalize">{demoCompany.plano} — R$ {demoCompany.valor_mensal}/mês</p>
                  <p className="text-sm text-muted-foreground">Próxima cobrança: {demoCompany.trial_ate}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0">Ativo</Badge>
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Últimas faturas</h4>
                <div className="space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const d = new Date(); d.setMonth(d.getMonth() - i);
                    return (
                      <div key={i} className="flex justify-between p-2 rounded border text-sm">
                        <span>{d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                        <span className="font-medium">R$ {demoCompany.valor_mensal},00</span>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">Pago</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
