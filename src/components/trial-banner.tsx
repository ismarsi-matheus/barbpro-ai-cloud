import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertCircle, Clock, AlertTriangle, Ban } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TrialBanner({ company }: { company: any }) {
  if (!company) return null;
  const status = company.status_cobranca;

  if (status === "suspenso") {
    return (
      <Banner color="red" icon={<Ban className="w-4 h-4" />}>
        Conta suspensa por falta de pagamento. Acesso bloqueado.{" "}
        <Link to="/app/configuracoes" className="underline font-semibold">Regularizar</Link>
      </Banner>
    );
  }
  if (status === "cancelado") {
    return (
      <Banner color="gray" icon={<Ban className="w-4 h-4" />}>
        Conta cancelada. <Link to="/app/configuracoes" className="underline font-semibold">Reativar</Link>
      </Banner>
    );
  }
  if (status === "inadimplente") {
    return (
      <Banner color="orange" icon={<AlertCircle className="w-4 h-4" />}>
        Pagamento em atraso. Sua conta será suspensa em breve.{" "}
        <Link to="/app/configuracoes" className="underline font-semibold">Cobrança</Link>
      </Banner>
    );
  }
  if (status === "trial" && company.trial_ate) {
    const days = differenceInCalendarDays(parseISO(company.trial_ate), new Date());
    if (days < 0) {
      return (
        <Banner color="red" icon={<AlertCircle className="w-4 h-4" />}>
          Seu período de teste expirou.{" "}
          <Link to="/app/configuracoes" className="underline font-semibold">Escolher plano</Link>
        </Banner>
      );
    }
    if (days < 3) {
      return (
        <Banner color="amber" icon={<AlertTriangle className="w-4 h-4" />}>
          Atenção: seu trial acaba em <strong>{days === 0 ? "menos de 1 dia" : `${days} dia${days !== 1 ? "s" : ""}`}</strong>.{" "}
          <Link to="/app/configuracoes" className="underline font-semibold">Assinar agora</Link>
        </Banner>
      );
    }
    return (
      <Banner color="brand" icon={<Clock className="w-4 h-4" />}>
        🎁 Período de teste — restam <strong>{days} dia{days !== 1 ? "s" : ""}</strong>.
      </Banner>
    );
  }
  return null;
}

function Banner({
  color, icon, children,
}: {
  color: "amber" | "orange" | "red" | "gray" | "brand";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    amber: "bg-amber-400 text-amber-950",
    orange: "bg-orange-500 text-white",
    red: "bg-red-600 text-white",
    gray: "bg-gray-800 text-white",
    brand: "bg-[var(--brand)] text-white",
  };
  return (
    <div className={`${map[color]} text-sm px-4 py-2 text-center font-medium flex items-center justify-center gap-2`}>
      {icon}<span>{children}</span>
    </div>
  );
}
