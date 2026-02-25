# Config reference

This page lists config keys used by OpenCami and relevant Gateway-side keys used with it.

## OpenCami environment variables

| Key | Required | Description |
|---|---:|---|
| `CLAWDBOT_GATEWAY_URL` | Yes | Gateway WebSocket URL. Default fallback is `ws://127.0.0.1:18789`. |
| `CLAWDBOT_GATEWAY_TOKEN` | Yes* | Recommended gateway auth token. |
| `CLAWDBOT_GATEWAY_PASSWORD` | Yes* | Alternative auth if token not used. |
| `OPENCAMI_ORIGIN` | No | Origin header OpenCami sends to Gateway WS. Needed for allowlisted remote setups. |
| `OPENCAMI_DEVICE_AUTH_FALLBACK` | No | `true`/`1` enables connect retry without device identity metadata. |
| `FILES_ROOT` | No | File explorer root. If unset, user home is used. |
| `OPENAI_API_KEY` | No | Enables OpenAI-backed features/routes. |
| `ELEVENLABS_API_KEY` | No | Enables ElevenLabs voice features. |

\*At least one of token/password must be set.

## Gateway-side settings relevant to OpenCami

| Key | Description |
|---|---|
| `gateway.controlUi.allowedOrigins` | Exact browser origins allowed for control UI clients. |
| `gateway.controlUi.dangerouslyDisableDeviceAuth` | Temporary last-resort relaxation for device auth checks (use cautiously). |

## CLI flags

See [CLI reference](./cli-reference.md).
