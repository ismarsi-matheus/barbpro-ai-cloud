import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias: /cliente/dashboard -> /cliente */
export const Route = createFileRoute("/cliente/dashboard")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/cliente", replace: true });
  },
  component: () => null,
});
