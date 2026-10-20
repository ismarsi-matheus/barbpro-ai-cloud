// Cliente Supabase com a identidade de quem chamou a server function:
// logado → usa o token dele (RLS e auth.uid() valem); visitante → anon.
// Para funções públicas que não podem exigir login (ex.: agendamento).
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // Chaves novas do Supabase são opacas, não JWT de bearer.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function supabaseForCaller() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Conexão com o banco não configurada.");

  const authHeader = getRequest()?.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isJwt = token.split(".").length === 3;

  return createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
      headers: isJwt ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
