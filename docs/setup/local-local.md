# Setup: local OpenCami + local Gateway

Best default for one machine.

## What this means

- OpenCami runs on your machine (for example `http://127.0.0.1:3000`)
- OpenClaw Gateway runs on the same machine (for example `ws://127.0.0.1:18789`)

## Quick start

```bash
# 1) Start/verify gateway
openclaw gateway status
# if needed:
openclaw gateway start

# 2) Run OpenCami
opencami --gateway ws://127.0.0.1:18789 --token <GATEWAY_TOKEN>
```

Open: `http://127.0.0.1:3000`

## Equivalent env-based setup

```bash
export CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
export CLAWDBOT_GATEWAY_TOKEN=<GATEWAY_TOKEN>
opencami
```

## Notes

- Use `ws://` for local loopback.
- `--gateway` must be a WebSocket URL (`ws://` or `wss://`), not `http://`/`https://`.
- Prefer token auth over password auth.
