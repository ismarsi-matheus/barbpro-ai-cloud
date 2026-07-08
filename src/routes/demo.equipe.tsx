import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { demoTeamMembers } from "@/lib/demo-data";
import { toast } from "sonner";

export const Route = createFileRoute("/demo/equipe")({ component: DemoEquipe });

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono", admin: "Admin", recepcao: "Recepção", financeiro: "Financeiro",
};

function DemoEquipe() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipe"
        description="Membros com acesso ao painel"
        action={
          <Button onClick={() => toast.info("Modal de convite (demo)")} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
            <Plus className="w-4 h-4 mr-1" /> Convidar membro
          </Button>
        }
      />
      <DataTable
        data={demoTeamMembers}
        searchableKeys={["nome", "email"]}
        columns={[
          { key: "nome", header: "Nome" },
          { key: "email", header: "Email" },
          { key: "role", header: "Papel", render: (r) => <Badge variant="outline">{ROLE_LABEL[r.role] ?? r.role}</Badge> },
          {
            key: "ativo", header: "Status",
            render: (r) => r.ativo
              ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Ativo</Badge>
              : <Badge variant="secondary">Inativo</Badge>,
          },
          { key: "ultimo_login", header: "Último login", render: (r) => format(parseISO(r.ultimo_login), "dd/MM HH:mm") },
        ]}
      />
    </div>
  );
}
