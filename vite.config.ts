// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { resolve } from "node:path";

// Windows: Vite entrega config.root com "/", mas o mcp-js compara com
// path.resolve (que usa "\") e aborta o dev server. Passa a raiz no formato nativo.
function windowsSafeMcpPlugin() {
  const plugin = mcpPlugin();
  if (process.platform !== "win32") return plugin;
  const configResolved = plugin.configResolved as (this: unknown, config: any) => void;
  plugin.configResolved = function (config) {
    configResolved.call(this, { ...config, root: resolve(config.root) });
  };
  return plugin;
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  plugins: [windowsSafeMcpPlugin()],
  tanstackStart: {
    server: { entry: "server" },
  },
});
