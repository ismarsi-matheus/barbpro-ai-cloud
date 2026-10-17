# Architecture rules
- Keep remote agent tools in `src/lib/mcp`, one `defineTool` per file, registered with `defineMcp`; the SDK Vite plugin owns transport routes to avoid divergent protocol implementations.
- MCP database reads must use a lazy caller-token client and existing ownership policies/RPCs, never an administrator client, to preserve account isolation.
- OAuth consent uses the existing client login with a canonical same-origin return path shared across every login method, so authorization survives sign-in without open redirects.
- Browser tools register in the screen owning the visible data and use the shared fail-open telemetry helper; they must not expose hidden records or consequential actions.