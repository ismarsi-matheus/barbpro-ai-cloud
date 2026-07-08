import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { SidebarDemo } from "@/components/sidebar-demo";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/demo")({ component: DemoLayout });

function DemoLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--surface)" }}>
      <SidebarDemo />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-amber-400 text-amber-950 text-sm px-4 py-2 flex items-center justify-center gap-3">
          <Sparkles className="w-4 h-4" />
          Você está no modo demonstração com dados fictícios.
          <Link to="/entrar" search={{ tab: "signup" }} className="underline font-semibold">Criar minha conta grátis →</Link>
        </div>
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
