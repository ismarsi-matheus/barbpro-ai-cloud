import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias: /cliente/login -> /cliente/entrar */
export const Route = createFileRoute("/cliente/login")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/cliente/entrar", replace: true });
  },
  component: () => null,
});
