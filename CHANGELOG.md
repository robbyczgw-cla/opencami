# Changelog

All notable changes to OpenCami are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-04-08

### Added

- **Follow-up suggestions toggle** in Settings, so people can enable or disable suggestions to match their workflow.
- **LLM Features model selector** in Settings with useful agents and friendlier model names.
- **Server-side `/api/llm-models` route** to load available agents from the OpenClaw Gateway.

### Fixed

- **Duplicate AI messages** no longer render twice during chat history updates.
- **Streaming whitespace** is preserved, so words no longer run together while responses stream in.
- **Follow-up suggestions** now appear reliably after streaming finishes.
- **Session titles** refresh correctly instead of showing raw session IDs after title generation.
- **Sidebar Cron Jobs** stays visible in SSR environments with a safe `localStorage` guard.
- **Follow-up suggestion language** now matches the conversation language.
- **LLM title generation** now consistently generates titles instead of answering the chat prompt.
- **Gateway URL handling** now converts `ws://` URLs to `http://` for LLM features API requests.
- **Tailscale Serve routing** now uses the Tailscale IP instead of loopback for more reliable remote access.
- **Tailscale hostname support** is allowed in Vite via updated `allowedHosts` handling.

## [2.0.0] - 2026-04-08

### ⚠️ Breaking

- **Legacy OpenAI API path removed** — the previous LLM integration (user-provided OpenAI API key, provider dropdown, API key settings tab) is fully removed. OpenCami now routes all LLM inference exclusively through the OpenClaw Gateway.

### Added

- **OpenClaw Gateway client** (`src/lib/openclaw-client.ts`) — lightweight, zero-config client for the local OpenClaw Gateway (`/v1/chat/completions`). No external API key required — uses the locally configured OpenClaw providers automatically.
- **Gateway health check** (`isOpenclawAvailable()`) — quick connectivity probe used for fallback decisions.

### Changed

- **Smart titles** now route through OpenClaw Gateway instead of OpenAI-compatible API. Falls back to heuristic generation if the gateway is unreachable.
- **Follow-up suggestions** now route through OpenClaw Gateway instead of gateway RPC or OpenAI-compatible API. Falls back to heuristic suggestions if the gateway is unreachable.
- **Settings dialog** — removed the "LLM Features" tab (API key input, provider dropdown, test key button). No longer needed — OpenClaw Gateway handles everything.
- **Gateway timeouts increased** to 30s default, 10s health check (was 10s / 5s). Prevents premature timeouts on first request.

### Removed

- `src/routes/api/llm-features.ts` — legacy `getLlmConfig()`, `generateSessionTitle()`, `generateFollowUps()` from `llm-client`, `DISABLE_OPENCLAW` fallback logic, `testkey` action
- `src/routes/api/follow-ups.ts` — legacy `gatewayRpc()` call, `FOLLOW_UP_SYSTEM_PROMPT`, `parseFollowUps()` helper
- `src/screens/chat/hooks/use-follow-up-suggestions.ts` — `getLlmHeaders()`, `useLlmSettings()` dependency
- `src/screens/chat/hooks/use-smart-title.ts` — `getLlmHeaders()`, `useLlmSettings()` dependency
- `src/screens/chat/components/settings-dialog.tsx` — entire LLM Features tab, API key state/handlers, provider settings
- `src/lib/llm-client.ts` — no longer imported by app code (file retained for compatibility)
- Tailscale-specific hardcoded hostnames replaced with generic example values

### Environment

| Variable | Description |
|----------|-------------|
| `OPENCLAW_GATEWAY_URL` | Gateway URL (default: `http://127.0.0.1:18789`) |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token |
| `CLAWDBOT_GATEWAY_TOKEN` | Alias for gateway auth token (backward compat) |

### Migration from v1.9.x

1. Remove any `OPENAI_API_KEY` environment variable from your OpenCami service config (no longer used)
2. Ensure OpenClaw Gateway is running on `http://127.0.0.1:18789` (default)
3. Ensure `CLAWDBOT_GATEWAY_TOKEN` is set in your systemd service (already set if using the standard setup)

## [1.9.1] - 2026-03-18

### Fixed

- **Image attachments preserved after stream** — images sent with a message no longer disappear when the assistant response finishes streaming. Root cause: history refetch after stream completion was merging server responses without restoring attachment data. Now `use-chat-history` captures renderable image parts from the cache before each refetch and restores them into matched server messages. Optimistic markers (`__optimisticId`, `clientId`) are also preserved across refetches for stable repeated merge (#19) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)
- **Retry UI handles attachment-only messages** — retry now works when the original message contained only images with no text (#15) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)
- **Retry preserves attachments** — retrying a failed message re-sends original image attachments instead of text-only (#15) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)
- **Reconnect jitter** — gateway reconnect backoff now uses jitter to prevent thundering herd on reconnect (#14) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)

### Improved

- Streaming event processing extracted into testable helpers with unit test coverage (#18)

## [1.9.0] - 2026-03-11
