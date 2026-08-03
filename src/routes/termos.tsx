import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — BarbeiroPro AI" },
      { name: "description", content: "Condições de uso da plataforma BarbeiroPro AI para barbearias e clientes." },
      { property: "og:title", content: "Termos de Uso — BarbeiroPro AI" },
      { property: "og:description", content: "Condições de uso da plataforma BarbeiroPro AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <div className="min-h-screen bg-[#F8F7F3] px-4 py-12 text-[#1B1C1E]">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/" className="text-sm text-black/50 hover:text-black">← Voltar</Link>
        <h1 className="text-3xl font-black tracking-tight">Termos de Uso</h1>
        <p className="text-black/70">
          Ao utilizar o BarbeiroPro AI você concorda em usar a plataforma de forma lícita e manter
          seus dados de cadastro atualizados.
        </p>
        <p className="text-black/70">
          Planos são cobrados conforme a assinatura escolhida e podem ser cancelados a qualquer
          momento, permanecendo ativos até o fim do período já pago.
        </p>
        <p className="text-black/70">
          Cada barbearia é responsável pelos serviços prestados aos seus clientes e pelas
          informações publicadas na sua página de agendamento.
        </p>
      </div>
    </div>
  );
}
