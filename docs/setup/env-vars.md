# Environment variables

Only documented keys that OpenCami reads today.

## Required for Gateway connectivity

```bash
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=<token>
# or: CLAWDBOT_GATEWAY_PASSWORD=<password>
```

## Optional

```bash
# Exact browser origin to send as WS Origin header (for allowlisted remote setups)
OPENCAMI_ORIGIN=https://opencami.example.com

# Retry connect without device identity metadata when strict handshake fails
OPENCAMI_DEVICE_AUTH_FALLBACK=true

# File explorer root (defaults to user home when unset)
FILES_ROOT=/path/to/workspace

# Optional provider keys used by feature routes/settings
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

## CLI compatibility note

`opencami --gateway ...` sets `CLAWDBOT_GATEWAY_URL` for the process.

Historically, some docs mention `OPENCLAW_GATEWAY`; prefer `CLAWDBOT_GATEWAY_URL` for predictable behavior.
