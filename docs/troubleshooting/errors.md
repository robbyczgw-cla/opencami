# Error identifiers and actionable fixes

Suggested concise errors OpenCami can display (mapping implementation can be done separately).

| Identifier | User-facing message | Likely cause | What to do |
|---|---|---|---|
| `OCAMI_GATEWAY_AUTH_MISSING` | Gateway auth is missing. | Neither `CLAWDBOT_GATEWAY_TOKEN` nor `CLAWDBOT_GATEWAY_PASSWORD` is set. | Set token (recommended) or password in server env, then restart OpenCami. |
| `OCAMI_GATEWAY_WS_OPEN_FAILED` | Could not open WebSocket to Gateway. | Wrong host/port/DNS, firewall, gateway down, wrong scheme. | Check `openclaw gateway status`, verify URL, use `ws://` local or `wss://` remote. |
| `OCAMI_GATEWAY_ORIGIN_NOT_ALLOWED` | Origin is not allowed by Gateway. | `OPENCAMI_ORIGIN` and `gateway.controlUi.allowedOrigins` do not match browser origin exactly. | Set exact same origin on both sides; restart gateway. |
| `OCAMI_GATEWAY_CHALLENGE_TIMEOUT` | Gateway challenge timed out. | `connect.challenge` nonce not received in time (often origin/proxy issue). | Recheck origin allowlist + reverse proxy WS handling; retry. |
| `OCAMI_GATEWAY_SCOPE_MISSING_OPERATOR_READ` | Connected, but token lacks required operator scope. | Auth succeeded but scopes don’t include `operator.read`. | Use token with operator read/write permissions. |
| `OCAMI_GATEWAY_RPC_TIMEOUT` | Gateway request timed out. | Slow/unreachable gateway or blocked event flow. | Check gateway load/network and retry; inspect server logs. |
| `OCAMI_GATEWAY_CONNECTION_CLOSED` | Gateway connection closed unexpectedly. | Gateway restart/network flap/proxy idle timeout. | Wait for auto-reconnect; if persistent, inspect proxy/network timeouts. |
| `OCAMI_DEVICE_AUTH_STRICT_FAILED` | Strict device auth failed. | Device identity handshake incompatibility in current environment. | Temporarily enable `OPENCAMI_DEVICE_AUTH_FALLBACK=true`, then investigate root cause. |
| `OCAMI_FILES_ROOT_INVALID` | Files root is inaccessible. | `FILES_ROOT` path missing or unreadable for process user. | Set valid readable path and restart OpenCami. |

## Notes

- Keep error text short, fix steps specific.
- Prefer one clear action over long diagnostics in the UI.
