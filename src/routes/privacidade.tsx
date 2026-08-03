import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — BarbeiroPro AI" },
      { name: "description", content: "Como o BarbeiroPro AI coleta, usa e protege os dados de barbearias e clientes." },
      { property: "og:title", content: "Política de Privacidade — BarbeiroPro AI" },
      { property: "og:description", content: "Como tratamos e protegemos seus dados no BarbeiroPro AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <div className="min-h-screen bg-[#F8F7F3] px-4 py-12 text-[#1B1C1E]">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/" className="text-sm text-black/50 hover:text-black">← Voltar</Link>
        <h1 className="text-3xl font-black tracking-tight">Política de Privacidade</h1>
        <p className="text-black/70">
          Coletamos apenas os dados necessários para operar o sistema: cadastro da barbearia,
          dados de agendamento e informações de contato dos clientes.
        </p>
        <p className="text-black/70">
          Os dados são armazenados de forma segura e não são vendidos a terceiros. Pagamentos são
          processados por provedores especializados; não armazenamos dados de cartão.
        </p>
        <p className="text-black/70">
          Você pode solicitar a exclusão da sua conta e dos seus dados a qualquer momento pela Área
          do Cliente ou pelo e-mail de contato.
        </p>
      </div>
    </div>
  );
}
