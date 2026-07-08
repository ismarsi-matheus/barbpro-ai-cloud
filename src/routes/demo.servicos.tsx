import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star } from "lucide-react";
import { demoCategories, demoServices } from "@/lib/demo-data";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/demo/servicos")({ component: DemoServ });

function DemoServ() {
  return (
    <div className="space-y-4">
      <PageHeader title="Serviços" description="Categorias e itens do catálogo" />
      <Tabs defaultValue="servicos">
        <TabsList>
          <TabsTrigger value="servicos">Serviços ({demoServices.length})</TabsTrigger>
          <TabsTrigger value="categorias">Categorias ({demoCategories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="servicos">
          <div className="space-y-6">
            {demoCategories.map((cat) => {
              const items = demoServices.filter((s) => s.category_id === cat.id);
              return (
                <div key={cat.id}>
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-2">{cat.name}</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((s) => (
                      <Card key={s.id} className={s.featured ? "border-[var(--brand)]/40" : ""}>
                        <CardContent className="pt-5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{s.name}</p>
                            {s.featured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {s.duration_minutes}min
                            </span>
                            <span className="font-bold text-[var(--brand)]">{formatBRL(s.price)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="space-y-2">
            {demoCategories.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{demoServices.filter((s) => s.category_id === c.id).length} serviços</p>
                  </div>
                  <Badge variant="outline">#{c.sort_order}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
